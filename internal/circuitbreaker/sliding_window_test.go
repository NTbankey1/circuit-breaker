package circuitbreaker_test

import (
	"testing"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

func TestSlidingWindow_BasicOperations(t *testing.T) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Record 8 successes and 2 failures
	for i := 0; i < 8; i++ {
		sw.Record(true)
	}
	for i := 0; i < 2; i++ {
		sw.Record(false)
	}

	requests, successes, failures := sw.GetCounts()

	if requests != 10 {
		t.Errorf("Expected 10 requests, got %d", requests)
	}
	if successes != 8 {
		t.Errorf("Expected 8 successes, got %d", successes)
	}
	if failures != 2 {
		t.Errorf("Expected 2 failures, got %d", failures)
	}
}

func TestSlidingWindow_FailureRate(t *testing.T) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Record 6 successes and 4 failures (40% failure rate)
	for i := 0; i < 6; i++ {
		sw.Record(true)
	}
	for i := 0; i < 4; i++ {
		sw.Record(false)
	}

	rate := sw.FailureRate()
	if rate < 0.39 || rate > 0.41 {
		t.Errorf("Expected ~0.4 failure rate, got %f", rate)
	}
}

func TestSlidingWindow_SuccessRate(t *testing.T) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Record 7 successes and 3 failures
	for i := 0; i < 7; i++ {
		sw.Record(true)
	}
	for i := 0; i < 3; i++ {
		sw.Record(false)
	}

	rate := sw.SuccessRate()
	if rate < 0.69 || rate > 0.71 {
		t.Errorf("Expected ~0.7 success rate, got %f", rate)
	}
}

func TestSlidingWindow_Reset(t *testing.T) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Record some data
	for i := 0; i < 5; i++ {
		sw.Record(true)
	}

	sw.Reset()

	requests, successes, failures := sw.GetCounts()
	if requests != 0 || successes != 0 || failures != 0 {
		t.Errorf("Expected all zeros after reset, got requests=%d, successes=%d, failures=%d",
			requests, successes, failures)
	}
}

func TestSlidingWindow_EmptyWindow(t *testing.T) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Empty window should return 0 failure rate
	if rate := sw.FailureRate(); rate != 0.0 {
		t.Errorf("Expected 0.0 failure rate for empty window, got %f", rate)
	}

	// Empty window should return 1.0 success rate
	if rate := sw.SuccessRate(); rate != 1.0 {
		t.Errorf("Expected 1.0 success rate for empty window, got %f", rate)
	}
}

func TestSlidingWindow_Config(t *testing.T) {
	config := circuitbreaker.DefaultSlidingWindowConfig()

	if config.WindowSize != 10*time.Second {
		t.Errorf("Expected 10s window size, got %v", config.WindowSize)
	}
	if config.BucketCount != 10 {
		t.Errorf("Expected 10 buckets, got %d", config.BucketCount)
	}
	if config.MinRequests != 10 {
		t.Errorf("Expected 10 min requests, got %d", config.MinRequests)
	}
	if config.FailureRateThresh != 0.5 {
		t.Errorf("Expected 0.5 failure threshold, got %f", config.FailureRateThresh)
	}
}

func BenchmarkSlidingWindow_Record(b *testing.B) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sw.Record(i%2 == 0)
	}
}

func BenchmarkSlidingWindow_GetCounts(b *testing.B) {
	sw := circuitbreaker.NewSlidingWindow(10*time.Second, 10)

	// Pre-fill with data
	for i := 0; i < 100; i++ {
		sw.Record(i%2 == 0)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sw.GetCounts()
	}
}
