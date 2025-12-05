package circuitbreaker

import (
	"context"
	"time"
)

// ExecuteWithContext runs the given function through the circuit breaker with context support.
// If the context is cancelled or times out, the request is counted as a failure.
func (cb *CircuitBreaker) ExecuteWithContext(ctx context.Context, fn func(ctx context.Context) error) error {
	generation, err := cb.beforeRequest()
	if err != nil {
		return err
	}

	// Use a channel to receive the result
	done := make(chan error, 1)

	go func() {
		defer func() {
			if e := recover(); e != nil {
				cb.afterRequest(generation, false)
				// Re-panic will be handled by caller
				panic(e)
			}
		}()

		done <- fn(ctx)
	}()

	select {
	case <-ctx.Done():
		// Context cancelled or timed out - count as failure
		cb.afterRequest(generation, false)
		return ctx.Err()

	case err := <-done:
		cb.afterRequest(generation, err == nil)
		return err
	}
}

// ExecuteWithTimeout runs the function with a timeout.
// If the function takes longer than timeout, it's counted as slow call (failure).
func (cb *CircuitBreaker) ExecuteWithTimeout(fn func() error, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return cb.ExecuteWithContext(ctx, func(ctx context.Context) error {
		return fn()
	})
}

// SlowCallConfig holds configuration for slow call detection
type SlowCallConfig struct {
	// SlowCallDuration defines what's considered a slow call
	SlowCallDuration time.Duration

	// SlowCallRateThreshold defines the threshold at which slow calls
	// should trip the circuit (0.0 to 1.0)
	SlowCallRateThreshold float64
}

// SlowCallDetector tracks and detects slow calls
type SlowCallDetector struct {
	config     SlowCallConfig
	slowCalls  uint32
	totalCalls uint32
}

// NewSlowCallDetector creates a new slow call detector
func NewSlowCallDetector(config SlowCallConfig) *SlowCallDetector {
	if config.SlowCallDuration == 0 {
		config.SlowCallDuration = 5 * time.Second
	}
	if config.SlowCallRateThreshold == 0 {
		config.SlowCallRateThreshold = 0.5
	}

	return &SlowCallDetector{
		config: config,
	}
}

// Record records a call duration
func (d *SlowCallDetector) Record(duration time.Duration) {
	d.totalCalls++
	if duration > d.config.SlowCallDuration {
		d.slowCalls++
	}
}

// SlowCallRate returns the current slow call rate
func (d *SlowCallDetector) SlowCallRate() float64 {
	if d.totalCalls == 0 {
		return 0.0
	}
	return float64(d.slowCalls) / float64(d.totalCalls)
}

// ShouldTrip returns true if slow call rate exceeds threshold
func (d *SlowCallDetector) ShouldTrip() bool {
	return d.SlowCallRate() >= d.config.SlowCallRateThreshold
}

// Reset clears all counts
func (d *SlowCallDetector) Reset() {
	d.slowCalls = 0
	d.totalCalls = 0
}
