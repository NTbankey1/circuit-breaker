package circuitbreaker

import "errors"

// FallbackFunc is a function that provides fallback behavior
type FallbackFunc func(err error) error

// ExecuteWithFallback runs the given function through the circuit breaker.
// If the circuit is open or the function fails, the fallback is called.
func (cb *CircuitBreaker) ExecuteWithFallback(fn func() error, fallback FallbackFunc) error {
	err := cb.Execute(fn)
	if err != nil {
		// Call fallback for circuit open or execution errors
		return fallback(err)
	}

	return nil
}

// ExecuteWithFallbackResult is a generic version of ExecuteWithFallback
// that supports returning a value along with an error.
func ExecuteWithFallbackResult[T any](cb *CircuitBreaker, fn func() (T, error), fallback func(error) (T, error)) (T, error) {
	var result T
	var fnErr error

	err := cb.Execute(func() error {
		result, fnErr = fn()
		return fnErr
	})
	if err != nil {
		// Call fallback for circuit open or execution errors
		return fallback(err)
	}

	return result, nil
}

// Common fallback strategies

// IgnoreFallback returns nil, ignoring the error
func IgnoreFallback() FallbackFunc {
	return func(err error) error {
		return nil
	}
}

// ReturnErrorFallback returns the original error
func ReturnErrorFallback() FallbackFunc {
	return func(err error) error {
		return err
	}
}

// WrapErrorFallback wraps the error with additional context
func WrapErrorFallback(message string) FallbackFunc {
	return func(err error) error {
		return errors.New(message + ": " + err.Error())
	}
}

// DefaultValueFallback returns a default value function
func DefaultValueFallback[T any](defaultValue T) func(error) (T, error) {
	return func(err error) (T, error) {
		return defaultValue, nil
	}
}

// CacheFallback returns a cached value when circuit opens
func CacheFallback[T any](getCached func() (T, bool)) func(error) (T, error) {
	return func(err error) (T, error) {
		if cached, ok := getCached(); ok {
			return cached, nil
		}
		var zero T
		return zero, err
	}
}

// ChainedFallback tries multiple fallback strategies in order
func ChainedFallback[T any](fallbacks ...func(error) (T, error)) func(error) (T, error) {
	return func(err error) (T, error) {
		for _, fb := range fallbacks {
			result, fbErr := fb(err)
			if fbErr == nil {
				return result, nil
			}
		}
		var zero T
		return zero, err
	}
}
