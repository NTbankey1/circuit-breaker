package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
	"github.com/ntbankey/circuit-breaker/pkg/client"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// Create metrics
	metrics := circuitbreaker.NewMetrics("demo")

	// Configure circuit breaker
	config := circuitbreaker.Config{
		MaxRequests: 3,
		Timeout:     5 * time.Second,
		Interval:    10 * time.Second,
		ReadyToTrip: func(counts circuitbreaker.Counts) bool {
			if counts.Requests == 0 {
				return false
			}
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from circuitbreaker.State, to circuitbreaker.State) {
			log.Printf("🔄 [%s] Circuit Breaker: %s → %s", name, from, to)
			if metrics != nil {
				metrics.RecordStateChange(name, from, to)
			}
		},
	}

	// Create HTTP client with circuit breaker
	httpClient := client.NewHTTPClient("example-service", config, metrics)

	// Start metrics server
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		log.Println("📊 Metrics server started on :2112")
		log.Fatal(http.ListenAndServe(":2112", nil))
	}()

	// Print header
	fmt.Println()
	fmt.Println("╔═══════════════════════════════════════════════════════════════╗")
	fmt.Println("║       🔨 Circuit Breaker Pattern Demo                         ║")
	fmt.Println("╠═══════════════════════════════════════════════════════════════╣")
	fmt.Println("║  Metrics: http://localhost:2112/metrics                       ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	log.Println("🚀 Starting circuit breaker demo...")
	log.Println("📋 Scenario: Service with varying health over time")
	log.Println("   - Requests 1-10:  70% failure rate (trigger circuit breaker)")
	log.Println("   - Requests 11-20: 30% failure rate (recovery testing)")
	log.Println("   - Requests 21+:   0% failure rate (healthy)")
	log.Println()

	for i := 1; i <= 50; i++ {
		// Simulate external service with varying health
		url := fmt.Sprintf("http://httpbin.org/status/%d", getStatusCode(i))

		resp, err := httpClient.Get(url)

		// Get current state and counts
		state := httpClient.State()
		counts := httpClient.Counts()

		if err == circuitbreaker.ErrCircuitOpen {
			log.Printf("[%02d] ⚠️  Circuit OPEN - Request rejected (fast fail)", i)
		} else if err != nil {
			log.Printf("[%02d] ❌ Request failed: %v", i, err)
		} else {
			log.Printf("[%02d] ✅ Request successful (status: %d)", i, resp.StatusCode)
			resp.Body.Close()
		}

		// Show current state
		stateEmoji := getStateEmoji(state)
		log.Printf("     %s State: %-10s | Total: %d | Success: %d | Fail: %d | ConsecFail: %d",
			stateEmoji, state, counts.Requests, counts.TotalSuccesses, counts.TotalFailures, counts.ConsecutiveFailures)

		time.Sleep(500 * time.Millisecond)
	}

	fmt.Println()
	log.Println("✅ Demo completed!")
	log.Println("📊 Check metrics at http://localhost:2112/metrics")
	log.Println("   Look for: circuit_breaker_* metrics")

	// Keep server running
	select {}
}

// getStatusCode simulates varying service health
func getStatusCode(requestNum int) int {
	// Requests 1-10: 70% failure (trigger circuit breaker)
	if requestNum <= 10 {
		if rand.Float64() < 0.7 {
			return 500 // Failure
		}
		return 200
	}

	// Requests 11-20: Service recovering (circuit will be half-open)
	if requestNum <= 20 {
		if rand.Float64() < 0.3 {
			return 500
		}
		return 200
	}

	// Requests 21+: Healthy (circuit should be closed)
	return 200
}

// getStateEmoji returns emoji for circuit state
func getStateEmoji(state circuitbreaker.State) string {
	switch state {
	case circuitbreaker.StateClosed:
		return "🟢"
	case circuitbreaker.StateHalfOpen:
		return "🟡"
	case circuitbreaker.StateOpen:
		return "🔴"
	default:
		return "⚪"
	}
}
