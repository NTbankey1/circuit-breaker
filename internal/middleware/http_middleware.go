package middleware

import (
	"net/http"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

// HTTPMiddlewareConfig configures the HTTP middleware
type HTTPMiddlewareConfig struct {
	// CircuitBreaker to use
	Breaker *circuitbreaker.CircuitBreaker

	// Metrics for recording request stats
	Metrics *circuitbreaker.Metrics

	// OnCircuitOpen is called when circuit is open, allowing custom responses
	OnCircuitOpen func(w http.ResponseWriter, r *http.Request)

	// IsSuccessful determines if a response is considered successful
	// Defaults to: 2xx and 3xx status codes
	IsSuccessful func(status int) bool
}

// HTTPMiddleware wraps HTTP handlers with circuit breaker protection
type HTTPMiddleware struct {
	config HTTPMiddlewareConfig
}

// NewHTTPMiddleware creates a new HTTP middleware
func NewHTTPMiddleware(config HTTPMiddlewareConfig) *HTTPMiddleware {
	if config.OnCircuitOpen == nil {
		config.OnCircuitOpen = defaultCircuitOpenHandler
	}
	if config.IsSuccessful == nil {
		config.IsSuccessful = defaultIsSuccessful
	}

	return &HTTPMiddleware{config: config}
}

// Wrap wraps an http.Handler with circuit breaker protection
func (m *HTTPMiddleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Check if circuit allows request
		if m.config.Breaker.State() == circuitbreaker.StateOpen {
			// Record rejection
			if m.config.Metrics != nil {
				m.config.Metrics.RecordRejection(m.config.Breaker.Name())
			}
			m.config.OnCircuitOpen(w, r)
			return
		}

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Execute through circuit breaker
		err := m.config.Breaker.Execute(func() error {
			next.ServeHTTP(wrapped, r)

			// Check if response indicates failure
			if !m.config.IsSuccessful(wrapped.statusCode) {
				return &httpError{statusCode: wrapped.statusCode}
			}
			return nil
		})

		duration := time.Since(start).Seconds()

		// Record metrics
		if m.config.Metrics != nil {
			if err == nil {
				m.config.Metrics.RecordSuccess(m.config.Breaker.Name())
				m.config.Metrics.RecordDuration(m.config.Breaker.Name(), "success", duration)
			} else if err == circuitbreaker.ErrCircuitOpen {
				m.config.Metrics.RecordRejection(m.config.Breaker.Name())
			} else {
				m.config.Metrics.RecordFailure(m.config.Breaker.Name())
				m.config.Metrics.RecordDuration(m.config.Breaker.Name(), "failure", duration)
			}
		}
	})
}

// WrapFunc wraps an http.HandlerFunc with circuit breaker protection
func (m *HTTPMiddleware) WrapFunc(next http.HandlerFunc) http.Handler {
	return m.Wrap(next)
}

// Handler returns a middleware handler for use with chi, gorilla/mux, etc.
func (m *HTTPMiddleware) Handler(next http.Handler) http.Handler {
	return m.Wrap(next)
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

// httpError represents an HTTP error response
type httpError struct {
	statusCode int
}

func (e *httpError) Error() string {
	return http.StatusText(e.statusCode)
}

// defaultCircuitOpenHandler returns a 503 Service Unavailable
func defaultCircuitOpenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Retry-After", "30")
	w.WriteHeader(http.StatusServiceUnavailable)
	w.Write([]byte(`{"error":"service temporarily unavailable","retry_after":30}`))
}

// defaultIsSuccessful considers 2xx and 3xx status codes as successful
func defaultIsSuccessful(status int) bool {
	return status >= 200 && status < 400
}

// RoundTripper wraps http.RoundTripper with circuit breaker for outgoing requests
type RoundTripper struct {
	base    http.RoundTripper
	breaker *circuitbreaker.CircuitBreaker
	metrics *circuitbreaker.Metrics
}

// NewRoundTripper creates a new circuit-protected RoundTripper
func NewRoundTripper(base http.RoundTripper, breaker *circuitbreaker.CircuitBreaker, metrics *circuitbreaker.Metrics) *RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return &RoundTripper{
		base:    base,
		breaker: breaker,
		metrics: metrics,
	}
}

// RoundTrip implements http.RoundTripper
func (rt *RoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	var resp *http.Response

	start := time.Now()
	err := rt.breaker.Execute(func() error {
		var err error
		resp, err = rt.base.RoundTrip(req)
		if err != nil {
			return err
		}

		// Consider 5xx as failures
		if resp.StatusCode >= 500 {
			return &httpError{statusCode: resp.StatusCode}
		}
		return nil
	})

	duration := time.Since(start).Seconds()

	// Record metrics
	if rt.metrics != nil {
		if err == nil {
			rt.metrics.RecordSuccess(rt.breaker.Name())
			rt.metrics.RecordDuration(rt.breaker.Name(), "success", duration)
		} else if err == circuitbreaker.ErrCircuitOpen {
			rt.metrics.RecordRejection(rt.breaker.Name())
		} else {
			rt.metrics.RecordFailure(rt.breaker.Name())
			rt.metrics.RecordDuration(rt.breaker.Name(), "failure", duration)
		}
	}

	return resp, err
}
