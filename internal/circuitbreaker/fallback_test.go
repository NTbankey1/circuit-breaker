package circuitbreaker_test

import (
	"errors"
	"testing"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

func TestExecuteWithFallback_Success(t *testing.T) {
	cb := circuitbreaker.New("test-fallback", circuitbreaker.Config{})
	fallbackCalled := false

	err := cb.ExecuteWithFallback(
		func() error {
			return nil
		},
		func(err error) error {
			fallbackCalled = true
			return nil
		},
	)
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
	if fallbackCalled {
		t.Error("Fallback should not be called on success")
	}
}

func TestExecuteWithFallback_FallbackOnError(t *testing.T) {
	cb := circuitbreaker.New("test-fallback", circuitbreaker.Config{})
	fallbackCalled := false
	originalErr := errors.New("original error")

	err := cb.ExecuteWithFallback(
		func() error {
			return originalErr
		},
		func(err error) error {
			fallbackCalled = true
			return nil // Fallback succeeds
		},
	)
	if err != nil {
		t.Errorf("Expected nil error from fallback, got %v", err)
	}
	if !fallbackCalled {
		t.Error("Fallback should be called on error")
	}
}

func TestExecuteWithFallback_CircuitOpen(t *testing.T) {
	cb := circuitbreaker.New("test-fallback", circuitbreaker.Config{
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 1
		},
	})

	// Trip the circuit
	cb.Execute(func() error { return errors.New("error") })

	fallbackCalled := false
	err := cb.ExecuteWithFallback(
		func() error {
			return nil
		},
		func(err error) error {
			fallbackCalled = true
			if err != circuitbreaker.ErrCircuitOpen {
				t.Errorf("Expected ErrCircuitOpen in fallback, got %v", err)
			}
			return nil
		},
	)
	if err != nil {
		t.Errorf("Expected nil error from fallback, got %v", err)
	}
	if !fallbackCalled {
		t.Error("Fallback should be called when circuit is open")
	}
}

func TestExecuteWithFallbackResult_Success(t *testing.T) {
	cb := circuitbreaker.New("test-fallback-result", circuitbreaker.Config{})

	result, err := circuitbreaker.ExecuteWithFallbackResult(cb,
		func() (int, error) {
			return 42, nil
		},
		func(err error) (int, error) {
			return -1, nil
		},
	)
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
	if result != 42 {
		t.Errorf("Expected 42, got %d", result)
	}
}

func TestExecuteWithFallbackResult_Fallback(t *testing.T) {
	cb := circuitbreaker.New("test-fallback-result", circuitbreaker.Config{})

	result, err := circuitbreaker.ExecuteWithFallbackResult(cb,
		func() (int, error) {
			return 0, errors.New("error")
		},
		func(err error) (int, error) {
			return -1, nil // Fallback value
		},
	)
	if err != nil {
		t.Errorf("Expected nil error from fallback, got %v", err)
	}
	if result != -1 {
		t.Errorf("Expected -1 (fallback), got %d", result)
	}
}

func TestDefaultValueFallback(t *testing.T) {
	fallback := circuitbreaker.DefaultValueFallback("default")
	result, err := fallback(errors.New("some error"))
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
	if result != "default" {
		t.Errorf("Expected 'default', got %s", result)
	}
}

func TestCacheFallback_Found(t *testing.T) {
	cachedValue := "cached"
	fallback := circuitbreaker.CacheFallback(func() (string, bool) {
		return cachedValue, true
	})

	result, err := fallback(errors.New("some error"))
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
	if result != cachedValue {
		t.Errorf("Expected %s, got %s", cachedValue, result)
	}
}

func TestCacheFallback_NotFound(t *testing.T) {
	originalErr := errors.New("original error")
	fallback := circuitbreaker.CacheFallback(func() (string, bool) {
		return "", false
	})

	_, err := fallback(originalErr)

	if err != originalErr {
		t.Errorf("Expected original error, got %v", err)
	}
}

func TestIgnoreFallback(t *testing.T) {
	fallback := circuitbreaker.IgnoreFallback()
	err := fallback(errors.New("some error"))
	if err != nil {
		t.Errorf("Expected nil, got %v", err)
	}
}

func TestWrapErrorFallback(t *testing.T) {
	fallback := circuitbreaker.WrapErrorFallback("wrapped message")
	err := fallback(errors.New("original"))

	if err == nil {
		t.Error("Expected wrapped error")
	}
	if err.Error() != "wrapped message: original" {
		t.Errorf("Unexpected error message: %s", err.Error())
	}
}
