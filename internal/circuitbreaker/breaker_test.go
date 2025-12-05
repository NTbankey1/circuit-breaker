package circuitbreaker_test

import (
	"errors"
	"testing"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

func TestCircuitBreaker_StateClosed(t *testing.T) {
	cb := circuitbreaker.New("test", circuitbreaker.Config{
		MaxRequests: 1,
		Timeout:     time.Second,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 3
		},
	})

	// Circuit should start closed
	if state := cb.State(); state != circuitbreaker.StateClosed {
		t.Errorf("Expected StateClosed, got %v", state)
	}

	// Successful requests should keep it closed
	for i := 0; i < 5; i++ {
		err := cb.Execute(func() error {
			return nil
		})
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}
	}

	if state := cb.State(); state != circuitbreaker.StateClosed {
		t.Errorf("Expected StateClosed after successes, got %v", state)
	}
}

func TestCircuitBreaker_StateOpen(t *testing.T) {
	cb := circuitbreaker.New("test", circuitbreaker.Config{
		MaxRequests: 1,
		Timeout:     100 * time.Millisecond,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 3
		},
	})

	// Trigger circuit breaker with failures
	testErr := errors.New("test error")
	for i := 0; i < 3; i++ {
		cb.Execute(func() error {
			return testErr
		})
	}

	// Circuit should be open
	if state := cb.State(); state != circuitbreaker.StateOpen {
		t.Errorf("Expected StateOpen, got %v", state)
	}

	// Requests should be rejected
	err := cb.Execute(func() error {
		return nil
	})

	if err != circuitbreaker.ErrCircuitOpen {
		t.Errorf("Expected ErrCircuitOpen, got %v", err)
	}
}

func TestCircuitBreaker_StateHalfOpen(t *testing.T) {
	cb := circuitbreaker.New("test", circuitbreaker.Config{
		MaxRequests: 2,
		Timeout:     100 * time.Millisecond,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 2
		},
	})

	// Trip the circuit
	for i := 0; i < 2; i++ {
		cb.Execute(func() error {
			return errors.New("error")
		})
	}

	// Wait for timeout
	time.Sleep(150 * time.Millisecond)

	// Circuit should be half-open
	if state := cb.State(); state != circuitbreaker.StateHalfOpen {
		t.Errorf("Expected StateHalfOpen, got %v", state)
	}

	// Successful requests should close the circuit
	for i := 0; i < 2; i++ {
		err := cb.Execute(func() error {
			return nil
		})
		if err != nil {
			t.Errorf("Unexpected error in half-open: %v", err)
		}
	}

	// Circuit should be closed again
	if state := cb.State(); state != circuitbreaker.StateClosed {
		t.Errorf("Expected StateClosed after successful half-open requests, got %v", state)
	}
}

func TestCircuitBreaker_HalfOpenFailureReopens(t *testing.T) {
	cb := circuitbreaker.New("test", circuitbreaker.Config{
		MaxRequests: 2,
		Timeout:     50 * time.Millisecond,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 2
		},
	})

	// Trip the circuit
	for i := 0; i < 2; i++ {
		cb.Execute(func() error {
			return errors.New("error")
		})
	}

	// Wait for half-open
	time.Sleep(100 * time.Millisecond)

	// Failure in half-open should reopen circuit
	cb.Execute(func() error {
		return errors.New("error")
	})

	if state := cb.State(); state != circuitbreaker.StateOpen {
		t.Errorf("Expected StateOpen after half-open failure, got %v", state)
	}
}

func TestCircuitBreaker_Counts(t *testing.T) {
	cb := circuitbreaker.New("test", circuitbreaker.Config{})

	// 3 successes
	for i := 0; i < 3; i++ {
		cb.Execute(func() error { return nil })
	}

	// 2 failures
	for i := 0; i < 2; i++ {
		cb.Execute(func() error { return errors.New("error") })
	}

	counts := cb.Counts()

	if counts.Requests != 5 {
		t.Errorf("Expected 5 requests, got %d", counts.Requests)
	}
	if counts.TotalSuccesses != 3 {
		t.Errorf("Expected 3 successes, got %d", counts.TotalSuccesses)
	}
	if counts.TotalFailures != 2 {
		t.Errorf("Expected 2 failures, got %d", counts.TotalFailures)
	}
	if counts.ConsecutiveFailures != 2 {
		t.Errorf("Expected 2 consecutive failures, got %d", counts.ConsecutiveFailures)
	}
}

func TestCircuitBreaker_StateChangeCallback(t *testing.T) {
	stateChanges := []string{}

	cb := circuitbreaker.New("test", circuitbreaker.Config{
		Timeout: 50 * time.Millisecond,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 2
		},
		OnStateChange: func(name string, from, to circuitbreaker.State) {
			stateChanges = append(stateChanges, from.String()+"->"+to.String())
		},
	})

	// Trigger state changes
	cb.Execute(func() error { return errors.New("error") })
	cb.Execute(func() error { return errors.New("error") }) // Should trigger Open

	time.Sleep(100 * time.Millisecond) // Should trigger HalfOpen
	cb.State()

	cb.Execute(func() error { return nil })
	cb.Execute(func() error { return nil }) // Should trigger Closed

	if len(stateChanges) < 2 {
		t.Errorf("Expected at least 2 state changes, got %d: %v", len(stateChanges), stateChanges)
	}
}

func BenchmarkCircuitBreaker_Closed(b *testing.B) {
	cb := circuitbreaker.New("bench", circuitbreaker.Config{})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.Execute(func() error {
			return nil
		})
	}
}

func BenchmarkCircuitBreaker_Open(b *testing.B) {
	cb := circuitbreaker.New("bench", circuitbreaker.Config{
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 1
		},
	})

	// Trip the circuit
	cb.Execute(func() error { return errors.New("error") })

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.Execute(func() error {
			return nil
		})
	}
}
