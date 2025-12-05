package circuitbreaker_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

func TestExecuteWithContext_Success(t *testing.T) {
	cb := circuitbreaker.New("test-context", circuitbreaker.Config{})

	ctx := context.Background()
	err := cb.ExecuteWithContext(ctx, func(ctx context.Context) error {
		return nil
	})
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
}

func TestExecuteWithContext_ContextCanceled(t *testing.T) {
	cb := circuitbreaker.New("test-context", circuitbreaker.Config{})

	ctx, cancel := context.WithCancel(context.Background())

	// Start a goroutine to cancel after a short delay
	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()

	err := cb.ExecuteWithContext(ctx, func(ctx context.Context) error {
		// Simulate long-running operation
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(100 * time.Millisecond):
			return nil
		}
	})

	if !errors.Is(err, context.Canceled) {
		t.Errorf("Expected context.Canceled, got %v", err)
	}
}

func TestExecuteWithContext_ContextTimeout(t *testing.T) {
	cb := circuitbreaker.New("test-context", circuitbreaker.Config{})

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	err := cb.ExecuteWithContext(ctx, func(ctx context.Context) error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(100 * time.Millisecond):
			return nil
		}
	})

	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("Expected context.DeadlineExceeded, got %v", err)
	}
}

func TestExecuteWithTimeout_Success(t *testing.T) {
	cb := circuitbreaker.New("test-timeout", circuitbreaker.Config{})

	err := cb.ExecuteWithTimeout(func() error {
		return nil // Fast return
	}, 100*time.Millisecond)
	if err != nil {
		t.Errorf("Expected nil error, got %v", err)
	}
}

func TestExecuteWithTimeout_Exceeded(t *testing.T) {
	cb := circuitbreaker.New("test-timeout", circuitbreaker.Config{})

	err := cb.ExecuteWithTimeout(func() error {
		time.Sleep(100 * time.Millisecond)
		return nil
	}, 20*time.Millisecond)

	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("Expected deadline exceeded, got %v", err)
	}
}

func TestSlowCallDetector_Basic(t *testing.T) {
	config := circuitbreaker.SlowCallConfig{
		SlowCallDuration:      100 * time.Millisecond,
		SlowCallRateThreshold: 0.5,
	}

	detector := circuitbreaker.NewSlowCallDetector(config)

	// Record some calls
	detector.Record(50 * time.Millisecond)  // Fast
	detector.Record(150 * time.Millisecond) // Slow
	detector.Record(50 * time.Millisecond)  // Fast
	detector.Record(200 * time.Millisecond) // Slow

	// 50% slow call rate
	rate := detector.SlowCallRate()
	if rate < 0.49 || rate > 0.51 {
		t.Errorf("Expected ~0.5 slow call rate, got %f", rate)
	}
}

func TestSlowCallDetector_ShouldTrip(t *testing.T) {
	config := circuitbreaker.SlowCallConfig{
		SlowCallDuration:      100 * time.Millisecond,
		SlowCallRateThreshold: 0.5,
	}

	detector := circuitbreaker.NewSlowCallDetector(config)

	// Record mostly slow calls
	detector.Record(150 * time.Millisecond)
	detector.Record(150 * time.Millisecond)
	detector.Record(150 * time.Millisecond)
	detector.Record(50 * time.Millisecond)

	if !detector.ShouldTrip() {
		t.Error("Expected ShouldTrip() to return true for 75% slow call rate")
	}
}

func TestSlowCallDetector_Reset(t *testing.T) {
	config := circuitbreaker.SlowCallConfig{
		SlowCallDuration:      100 * time.Millisecond,
		SlowCallRateThreshold: 0.5,
	}

	detector := circuitbreaker.NewSlowCallDetector(config)

	detector.Record(150 * time.Millisecond)
	detector.Reset()

	if rate := detector.SlowCallRate(); rate != 0.0 {
		t.Errorf("Expected 0 rate after reset, got %f", rate)
	}
}
