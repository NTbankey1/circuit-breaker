package circuitbreaker

import "time"

// Config holds configuration for the circuit breaker
type Config struct {
	// MaxRequests is the maximum number of requests allowed to pass through
	// when the CircuitBreaker is half-open.
	// If MaxRequests is 0, the CircuitBreaker allows only 1 request.
	MaxRequests uint32

	// Interval is the cyclic period of the closed state for the CircuitBreaker
	// to clear the internal Counts.
	// If Interval is 0, the CircuitBreaker doesn't clear internal Counts during
	// the closed state.
	Interval time.Duration

	// Timeout is the period of the open state, after which the state becomes half-open.
	// If Timeout is 0, the timeout value is 60 seconds.
	Timeout time.Duration

	// ReadyToTrip is called with a copy of Counts whenever a request fails in the
	// closed state. If ReadyToTrip returns true, the CircuitBreaker will be placed
	// into the open state.
	// If ReadyToTrip is nil, default ReadyToTrip is used.
	// Default ReadyToTrip returns true when the number of consecutive failures is more than 5.
	ReadyToTrip func(counts Counts) bool

	// OnStateChange is called whenever the state of the CircuitBreaker changes.
	OnStateChange func(name string, from State, to State)

	// IsSuccessful is called with the error returned from a request.
	// If IsSuccessful returns true, the error is counted as a success.
	// Otherwise, the error is counted as a failure.
	// If IsSuccessful is nil, default IsSuccessful is used, which returns false for all non-nil errors.
	IsSuccessful func(err error) bool
}

// defaultConfig returns default configuration
func defaultConfig() Config {
	return Config{
		MaxRequests: 1,
		Interval:    0,
		Timeout:     60 * time.Second,
		ReadyToTrip: func(counts Counts) bool {
			// Default: trip after 5 consecutive failures
			return counts.ConsecutiveFailures > 5
		},
		OnStateChange: func(name string, from State, to State) {
			// No-op by default
		},
		IsSuccessful: func(err error) bool {
			// Default: any error is a failure
			return err == nil
		},
	}
}

// merge merges user config with default config
func (c Config) merge() Config {
	config := defaultConfig()

	if c.MaxRequests != 0 {
		config.MaxRequests = c.MaxRequests
	}

	config.Interval = c.Interval

	if c.Timeout != 0 {
		config.Timeout = c.Timeout
	}

	if c.ReadyToTrip != nil {
		config.ReadyToTrip = c.ReadyToTrip
	}

	if c.OnStateChange != nil {
		config.OnStateChange = c.OnStateChange
	}

	if c.IsSuccessful != nil {
		config.IsSuccessful = c.IsSuccessful
	}

	return config
}
