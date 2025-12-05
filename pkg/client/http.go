package client

import (
	"context"
	"io"
	"net/http"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

// HTTPClient wraps http.Client with circuit breaker
type HTTPClient struct {
	client  *http.Client
	breaker *circuitbreaker.CircuitBreaker
	metrics *circuitbreaker.Metrics
}

// NewHTTPClient creates a new HTTP client with circuit breaker
func NewHTTPClient(name string, config circuitbreaker.Config, metrics *circuitbreaker.Metrics) *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		breaker: circuitbreaker.New(name, config),
		metrics: metrics,
	}
}

// Get performs a GET request through the circuit breaker
func (c *HTTPClient) Get(url string) (*http.Response, error) {
	return c.Do(http.MethodGet, url, nil)
}

// Post performs a POST request through the circuit breaker
func (c *HTTPClient) Post(url string, body io.Reader) (*http.Response, error) {
	return c.Do(http.MethodPost, url, body)
}

// Do performs an HTTP request through the circuit breaker
func (c *HTTPClient) Do(method, url string, body io.Reader) (*http.Response, error) {
	var resp *http.Response

	start := time.Now()
	err := c.breaker.Execute(func() error {
		req, err := http.NewRequestWithContext(context.Background(), method, url, body)
		if err != nil {
			return err
		}

		resp, err = c.client.Do(req)
		return err
	})

	duration := time.Since(start).Seconds()

	// Record metrics
	if c.metrics != nil {
		if err == nil {
			c.metrics.RecordSuccess(c.breaker.Name())
			c.metrics.RecordDuration(c.breaker.Name(), "success", duration)
		} else if err == circuitbreaker.ErrCircuitOpen {
			c.metrics.RecordRejection(c.breaker.Name())
		} else {
			c.metrics.RecordFailure(c.breaker.Name())
			c.metrics.RecordDuration(c.breaker.Name(), "failure", duration)
		}
	}

	return resp, err
}

// State returns the current state of the circuit breaker
func (c *HTTPClient) State() circuitbreaker.State {
	return c.breaker.State()
}

// Counts returns the current counts
func (c *HTTPClient) Counts() circuitbreaker.Counts {
	return c.breaker.Counts()
}

// CircuitBreaker returns the underlying circuit breaker
func (c *HTTPClient) CircuitBreaker() *circuitbreaker.CircuitBreaker {
	return c.breaker
}
