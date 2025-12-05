package circuitbreaker

import "fmt"

// State represents the circuit breaker state
type State int

const (
	// StateClosed - Circuit is closed, requests pass through
	StateClosed State = iota
	
	// StateHalfOpen - Circuit is testing if service recovered
	StateHalfOpen
	
	// StateOpen - Circuit is open, requests fail fast
	StateOpen
)

// String returns the string representation of the state
func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateHalfOpen:
		return "half-open"
	case StateOpen:
		return "open"
	default:
		return fmt.Sprintf("unknown state: %d", s)
	}
}

// Counts holds statistics about requests
type Counts struct {
	// Total number of requests
	Requests uint32
	
	// Total successful requests
	TotalSuccesses uint32
	
	// Total failed requests
	TotalFailures uint32
	
	// Consecutive successful requests
	ConsecutiveSuccesses uint32
	
	// Consecutive failed requests
	ConsecutiveFailures uint32
}

// onRequest increments request counter
func (c *Counts) onRequest() {
	c.Requests++
}

// onSuccess records a successful request
func (c *Counts) onSuccess() {
	c.TotalSuccesses++
	c.ConsecutiveSuccesses++
	c.ConsecutiveFailures = 0
}

// onFailure records a failed request
func (c *Counts) onFailure() {
	c.TotalFailures++
	c.ConsecutiveFailures++
	c.ConsecutiveSuccesses = 0
}

// clear resets all counters
func (c *Counts) clear() {
	c.Requests = 0
	c.TotalSuccesses = 0
	c.TotalFailures = 0
	c.ConsecutiveSuccesses = 0
	c.ConsecutiveFailures = 0
}
