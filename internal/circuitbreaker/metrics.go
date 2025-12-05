package circuitbreaker

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds Prometheus metrics for circuit breaker
type Metrics struct {
	requests       *prometheus.CounterVec
	successes      *prometheus.CounterVec
	failures       *prometheus.CounterVec
	rejections     *prometheus.CounterVec
	stateChanges   *prometheus.CounterVec
	currentState   *prometheus.GaugeVec
	requestLatency *prometheus.HistogramVec
}

// NewMetrics creates a new Metrics instance
func NewMetrics(namespace string) *Metrics {
	return &Metrics{
		requests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_requests_total",
				Help:      "Total number of requests",
			},
			[]string{"name"},
		),
		successes: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_successes_total",
				Help:      "Total number of successful requests",
			},
			[]string{"name"},
		),
		failures: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_failures_total",
				Help:      "Total number of failed requests",
			},
			[]string{"name"},
		),
		rejections: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_rejections_total",
				Help:      "Total number of rejected requests (circuit open)",
			},
			[]string{"name"},
		),
		stateChanges: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_state_changes_total",
				Help:      "Total number of state changes",
			},
			[]string{"name", "from", "to"},
		),
		currentState: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_state",
				Help:      "Current state of the circuit breaker (0=closed, 1=half-open, 2=open)",
			},
			[]string{"name"},
		),
		requestLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: namespace,
				Name:      "circuit_breaker_request_duration_seconds",
				Help:      "Request duration in seconds",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"name", "status"},
		),
	}
}

// RecordRequest records a request
func (m *Metrics) RecordRequest(name string) {
	m.requests.WithLabelValues(name).Inc()
}

// RecordSuccess records a successful request
func (m *Metrics) RecordSuccess(name string) {
	m.successes.WithLabelValues(name).Inc()
}

// RecordFailure records a failed request
func (m *Metrics) RecordFailure(name string) {
	m.failures.WithLabelValues(name).Inc()
}

// RecordRejection records a rejected request
func (m *Metrics) RecordRejection(name string) {
	m.rejections.WithLabelValues(name).Inc()
}

// RecordStateChange records a state change
func (m *Metrics) RecordStateChange(name string, from, to State) {
	m.stateChanges.WithLabelValues(name, from.String(), to.String()).Inc()
	m.currentState.WithLabelValues(name).Set(float64(to))
}

// RecordLatency records request latency
func (m *Metrics) RecordLatency(name string, duration float64, status string) {
	m.requestLatency.WithLabelValues(name, status).Observe(duration)
}

// RecordDuration is an alias for RecordLatency with reordered parameters
// Provided for API consistency with external callers
func (m *Metrics) RecordDuration(name, status string, duration float64) {
	m.requestLatency.WithLabelValues(name, status).Observe(duration)
}
