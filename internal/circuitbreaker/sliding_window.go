package circuitbreaker

import (
	"sync"
	"time"
)

// SlidingWindow implements a time-based sliding window for tracking
// request outcomes with more accurate failure rate calculation.
type SlidingWindow struct {
	mu       sync.RWMutex
	size     time.Duration // Window duration
	buckets  []*Bucket     // Time buckets
	numBucks int           // Number of buckets
	total    windowCounts  // Aggregated counts
}

// Bucket represents a single time bucket in the window
type Bucket struct {
	startTime time.Time
	requests  uint32
	successes uint32
	failures  uint32
}

// windowCounts holds aggregated counts for the entire window
type windowCounts struct {
	requests  uint32
	successes uint32
	failures  uint32
}

// NewSlidingWindow creates a new sliding window counter
// size: total window duration (e.g., 10 seconds)
// numBuckets: number of buckets to divide the window (e.g., 10 = 1 second each)
func NewSlidingWindow(size time.Duration, numBuckets int) *SlidingWindow {
	if numBuckets <= 0 {
		numBuckets = 10
	}
	if size <= 0 {
		size = 10 * time.Second
	}

	sw := &SlidingWindow{
		size:     size,
		numBucks: numBuckets,
		buckets:  make([]*Bucket, 0, numBuckets),
	}
	return sw
}

// Record records a request outcome
func (sw *SlidingWindow) Record(success bool) {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	now := time.Now()
	sw.expire(now)

	// Get or create current bucket
	bucket := sw.getCurrentBucket(now)
	bucket.requests++
	sw.total.requests++

	if success {
		bucket.successes++
		sw.total.successes++
	} else {
		bucket.failures++
		sw.total.failures++
	}
}

// GetCounts returns current counts within the window
func (sw *SlidingWindow) GetCounts() (requests, successes, failures uint32) {
	sw.mu.RLock()
	defer sw.mu.RUnlock()

	sw.expireReadOnly(time.Now())
	return sw.total.requests, sw.total.successes, sw.total.failures
}

// FailureRate returns the current failure rate (0.0 to 1.0)
func (sw *SlidingWindow) FailureRate() float64 {
	requests, _, failures := sw.GetCounts()
	if requests == 0 {
		return 0.0
	}
	return float64(failures) / float64(requests)
}

// SuccessRate returns the current success rate (0.0 to 1.0)
func (sw *SlidingWindow) SuccessRate() float64 {
	requests, successes, _ := sw.GetCounts()
	if requests == 0 {
		return 1.0
	}
	return float64(successes) / float64(requests)
}

// Reset clears all buckets
func (sw *SlidingWindow) Reset() {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	sw.buckets = sw.buckets[:0]
	sw.total = windowCounts{}
}

// expire removes old buckets that are outside the window
func (sw *SlidingWindow) expire(now time.Time) {
	windowStart := now.Add(-sw.size)

	// Remove expired buckets
	validStart := 0
	for i, bucket := range sw.buckets {
		if bucket.startTime.After(windowStart) {
			break
		}
		// Subtract from total
		sw.total.requests -= bucket.requests
		sw.total.successes -= bucket.successes
		sw.total.failures -= bucket.failures
		validStart = i + 1
	}

	if validStart > 0 {
		sw.buckets = sw.buckets[validStart:]
	}
}

// expireReadOnly calculates expired buckets without modifying (for read operations)
func (sw *SlidingWindow) expireReadOnly(now time.Time) {
	windowStart := now.Add(-sw.size)

	// Subtract expired buckets from copy
	for _, bucket := range sw.buckets {
		if bucket.startTime.After(windowStart) {
			break
		}
		sw.total.requests -= bucket.requests
		sw.total.successes -= bucket.successes
		sw.total.failures -= bucket.failures
	}
}

// getCurrentBucket returns the current bucket, creating if needed
func (sw *SlidingWindow) getCurrentBucket(now time.Time) *Bucket {
	bucketDuration := sw.size / time.Duration(sw.numBucks)
	bucketStart := now.Truncate(bucketDuration)

	// Check if last bucket is current
	if len(sw.buckets) > 0 {
		last := sw.buckets[len(sw.buckets)-1]
		if last.startTime.Equal(bucketStart) {
			return last
		}
	}

	// Create new bucket
	bucket := &Bucket{startTime: bucketStart}
	sw.buckets = append(sw.buckets, bucket)

	// Limit number of buckets
	if len(sw.buckets) > sw.numBucks {
		// Remove oldest
		removed := sw.buckets[0]
		sw.total.requests -= removed.requests
		sw.total.successes -= removed.successes
		sw.total.failures -= removed.failures
		sw.buckets = sw.buckets[1:]
	}

	return bucket
}

// SlidingWindowConfig holds configuration for sliding window based circuit breaker
type SlidingWindowConfig struct {
	WindowSize        time.Duration // Size of the sliding window
	BucketCount       int           // Number of buckets in the window
	MinRequests       uint32        // Minimum requests before evaluating
	FailureRateThresh float64       // Failure rate threshold to trip (0.0-1.0)
}

// DefaultSlidingWindowConfig returns sensible defaults
func DefaultSlidingWindowConfig() SlidingWindowConfig {
	return SlidingWindowConfig{
		WindowSize:        10 * time.Second,
		BucketCount:       10,
		MinRequests:       10,
		FailureRateThresh: 0.5,
	}
}

// MakeReadyToTrip creates a ReadyToTrip function using sliding window
func (c SlidingWindowConfig) MakeReadyToTrip(sw *SlidingWindow) func(Counts) bool {
	return func(counts Counts) bool {
		requests, _, failures := sw.GetCounts()
		if requests < c.MinRequests {
			return false
		}
		failureRate := float64(failures) / float64(requests)
		return failureRate >= c.FailureRateThresh
	}
}
