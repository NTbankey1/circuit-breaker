# 🔨 Circuit Breaker Pattern - Go Implementation

A comprehensive, production-ready implementation of the **Circuit Breaker Pattern** in Golang for building resilient microservices.

## 📋 Table of Contents

- [Overview](#overview)
- [What is Circuit Breaker](#what-is-circuit-breaker)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Concepts](#concepts)
- [Configuration](#configuration)
- [Examples](#examples)
- [Metrics & Monitoring](#metrics--monitoring)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## 🎯 Overview

The Circuit Breaker pattern prevents an application from repeatedly attempting an operation that's likely to fail, allowing it to continue without waiting for the fault to be fixed or wasting CPU cycles.

### Features

- ✅ **Three States**: Closed, Open, Half-Open
- ✅ **Thread-Safe**: Safe for concurrent use
- ✅ **Configurable** failure thresholds and timeouts
- ✅ **Prometheus Metrics** for monitoring
- ✅ **HTTP & gRPC** client examples
- ✅ **Fallback Support** for graceful degradation
- ✅ **State Change Callbacks** for notifications
- ✅ **Multiple Strategies**: Failure rate, consecutive failures, slow calls

---

## 🧠 What is Circuit Breaker?

Circuit Breaker is a design pattern used in modern microservices to detect failures and prevent cascading failures.

### Problem it Solves

Imagine you have Service A calling Service B:

```
Service A ──→ Service B (failing)
```

**Without Circuit Breaker:**
- Service A keeps calling failing Service B
- Wastes resources (threads, connections)
- Increases latency for users
- Can cause cascading failures
- Service A might also fail

**With Circuit Breaker:**
- Detects Service B is failing
- Stops calling Service B temporarily
- Returns fast failures or fallback responses
- Allows Service B time to recover
- Periodically checks if Service B recovered

### Real-World Analogy

Think of it like a home electrical circuit breaker:
- **Closed** (Normal): Electricity flows normally
- **Open** (Fault detected): Breaks the circuit to prevent damage
- **Half-Open** (Testing): Cautiously tests if it's safe to close again

---

## 🏗️ Architecture

### State Machine

```
                ┌─────────────┐
                │   CLOSED    │ ← Normal operation
                │ (All pass)  │
                └──────┬──────┘
                       │
            Failure    │    Success rate OK
           threshold   │
            reached    │
                       │
                ┌──────▼──────┐
                │    OPEN     │ ← Fast-fail mode
                │ (All fail)  │
                └──────┬──────┘
                       │
            Timeout    │
            expires    │
                       │
                ┌──────▼──────────┐
                │   HALF-OPEN     │ ← Testing recovery
                │ (Limited pass)  │
                └──────┬──────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
     Success │                │ Any
    threshold│                │ failure
      met    │                │
            │                     │
        ┌───▼──┐              ┌──▼───┐
        │CLOSED│              │ OPEN │
        └──────┘              └──────┘
```

### State Descriptions

#### 🟢 **CLOSED State** (Normal Operation)

- All requests pass through to the service
- Tracks success and failure counts
- If failure threshold is reached → transition to OPEN
- Example: `5 consecutive failures` or `60% failure rate in last 10 requests`

#### 🔴 **OPEN State** (Circuit Tripped)

- All requests fail immediately with `ErrCircuitOpen`
- No actual calls made to the failing service
- After timeout period → transition to HALF-OPEN
- Example timeout: `60 seconds`

#### 🟡 **HALF-OPEN State** (Testing Recovery)

- Allows a limited number of requests through
- If all test requests succeed → transition to CLOSED
- If any request fails → transition back to OPEN
- Example: Allow `3 test requests`

---

## 📦 Installation

```bash
# Clone the repository
cd /path/to/circuit-breaker

# Download dependencies
go mod download

# Run HTTP example
go run cmd/http-example/main.go

# Run with your own code
import "github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
```

---

## 🚀 Quick Start

### Basic Usage

```go
package main

import (
    "fmt"
    "time"
    "github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

func main() {
    // Configure circuit breaker
    config := circuitbreaker.Config{
        MaxRequests: 3,                // Allow 3 requests in Half-Open
        Timeout:     5 * time.Second,  // Open → Half-Open after 5s
        ReadyToTrip: func(counts circuitbreaker.Counts) bool {
            // Trip circuit after 5 consecutive failures
            return counts.ConsecutiveFailures > 5
        },
        OnStateChange: func(name string, from, to circuitbreaker.State) {
            fmt.Printf("Circuit %s: %s → %s\\n", name, from, to)
        },
    }
    
    // Create circuit breaker
    cb := circuitbreaker.New("my-service", config)
    
    // Execute function through circuit breaker
    err := cb.Execute(func() error {
        // Your code here (e.g., HTTP call, DB query)
        return callExternalService()
    })
    
    if err == circuitbreaker.ErrCircuitOpen {
        // Circuit is open, use fallback
        return useFallback()
    }
    
    return err
}
```

### HTTP Client Example

```go
import (
    "github.com/ntbankey/circuit-breaker/pkg/client"
    "github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
)

// Create HTTP client with circuit breaker
httpClient := client.NewHTTPClient("api-service", config, metrics)

// Make request
response, err := httpClient.Get("https://api.example.com/data")
if err == circuitbreaker.ErrCircuitOpen {
    // Handle circuit open (use cache, return default, etc.)
    return getCachedData()
}
```

---

## 📚 Concepts

### 1. Failure Detection Strategies

#### Strategy 1: Consecutive Failures

```go
ReadyToTrip: func(counts circuitbreaker.Counts) bool {
    return counts.ConsecutiveFailures >= 5
}
```

**Use Case:** Service is definitely down (5 failures in a row)

#### Strategy 2: Failure Rate

```go
ReadyToTrip: func(counts circuitbreaker.Counts) bool {
    failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
    return counts.Requests >= 10 && failureRatio >= 0.6
}
```

**Use Case:** Service is degraded (60% failures in last 10 requests)

#### Strategy 3: Hybrid

```go
ReadyToTrip: func(counts circuitbreaker.Counts) bool {
    // Trip if 5 consecutive failures OR 70% failure rate
    failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
    return counts.ConsecutiveFailures >= 5 || 
           (counts.Requests >= 10 && failureRatio >= 0.7)
}
```

---

### 2. Timeout Configuration

The timeout determines how long to wait in OPEN state before testing recovery:

```go
Timeout: 60 * time.Second  // Wait 1 minute before trying again
```

**Considerations:**
- **Too Short** (5s): May not give service enough time to recover
- **Too Long** (5min): Takes too long to detect recovery
- **Recommended**: 30-60 seconds for most services

---

### 3. Half-Open Requests

Controls how many test requests to allow in Half-Open state:

```go
MaxRequests: 3  // Allow 3 test requests
```

**Behavior:**
- If all 3 succeed → Circuit closes
- If any 1 fails → Circuit opens again

---

### 4. Interval (Closed State)

Clear success/failure counts periodically in Closed state:

```go
Interval: 10 * time.Second  // Reset counts every 10s
```

**Use Case:** Prevent old failures from affecting current health

---

## ⚙️ Configuration

### Complete Configuration Example

```go
config := circuitbreaker.Config{
    // Half-Open state configuration
    MaxRequests: 3,
    
    // Closed state configuration
    Interval: 10 * time.Second,
    
    // Open state configuration
    Timeout: 60 * time.Second,
    
    // Custom failure detection
    ReadyToTrip: func(counts circuitbreaker.Counts) bool {
        // Trip after 5 consecutive failures OR 60% failure rate
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.ConsecutiveFailures >= 5 || 
               (counts.Requests >= 10 && failureRatio >= 0.6)
    },
    
    // State change notification
    OnStateChange: func(name string, from, to circuitbreaker.State) {
        log.Printf("Circuit [%s]: %s → %s", name, from, to)
        // Send alert, update metrics, etc.
    },
}
```

### Configuration Presets

#### Conservative (Prefer Availability)

```go
config := circuitbreaker.Config{
    MaxRequests: 5,                  // More test requests
    Timeout:     30 * time.Second,   // Quick recovery attempts
    ReadyToTrip: func(c circuitbreaker.Counts) bool {
        return c.ConsecutiveFailures >= 10  // Higher threshold
    },
}
```

#### Aggressive (Prefer Protection)

```go
config := circuitbreaker.Config{
    MaxRequests: 1,                  // One test request only
    Timeout:     120 * time.Second,  // Wait longer
    ReadyToTrip: func(c circuitbreaker.Counts) bool {
        return c.ConsecutiveFailures >= 3  // Lower threshold
    },
}
```

---

## 💡 Examples

### Example 1: HTTP Client

See [cmd/http-example/main.go](cmd/http-example/main.go)

```bash
# Run the example
go run cmd/http-example/main.go
```

**What it demonstrates:**
1. ✅ Circuit starts in CLOSED state
2. ❌ Service fails repeatedly → Circuit opens
3. 🚫 Requests rejected immediately in OPEN state
4. ⏳ After timeout → Circuit enters HALF-OPEN
5. ✅ Service recovers → Circuit closes again

---

## 📊 Metrics & Monitoring

### Prometheus Metrics

The circuit breaker exports the following Prometheus metrics:

```
# Total requests
circuit_breaker_requests_total{name="my-service"} 150

# Successful requests
circuit_breaker_successes_total{name="my-service"} 120

# Failed requests
circuit_breaker_failures_total{name="my-service"} 30

# Rejected requests (circuit open)
circuit_breaker_rejections_total{name="my-service"} 45

# State changes
circuit_breaker_state_changes_total{name="my-service",from="closed",to="open"} 3

# Current state (0=closed, 1=half-open, 2=open)
circuit_breaker_state{name="my-service"} 0

# Request latency
circuit_breaker_request_duration_seconds{name="my-service",status="success"}
```

### Viewing Metrics

```bash
# Start the HTTP example (includes metrics endpoint)
go run cmd/http-example/main.go

# View metrics
curl http://localhost:2112/metrics
```

### Grafana Dashboard

Create alerts for:
- High rejection rate
- Frequent state changes
- Circuit stuck in OPEN state

---

## ✅ Best Practices

### 1. Always Provide Fallbacks

```go
err := cb.Execute(func() error {
    return callPrimaryService()
})

if err == circuitbreaker.ErrCircuitOpen {
    // Fallback strategies:
    return getCachedData()      // Return cached data
    return getDefaultValue()    // Return safe default
    return callBackupService()  // Try alternate service
}
```

### 2. Different Circuits for Different Services

```go
// Don't share circuit breakers across services
userServiceCB := circuitbreaker.New("user-service", config)
orderServiceCB := circuitbreaker.New("order-service", config)
paymentServiceCB := circuitbreaker.New("payment-service", config)
```

### 3. Monitor State Changes

```go
OnStateChange: func(name string, from, to circuitbreaker.State) {
    // Log state changes
    log.Printf("Circuit %s: %s → %s", name, from, to)
    
    // Send alerts if circuit opens
    if to == circuitbreaker.StateOpen {
        alerting.Send("Circuit breaker opened: " + name)
    }
    
    // Update metrics
    metrics.RecordStateChange(name, from, to)
}
```

### 4. Tune Configuration Based on SLA

```go
// Critical service (strict SLA)
criticalConfig := circuitbreaker.Config{
    MaxRequests: 1,
    Timeout:     120 * time.Second,
    ReadyToTrip: func(c Counts) bool {
        return c.ConsecutiveFailures >= 3  // Trip quickly
    },
}

// Non-critical service (relaxed SLA)
relaxedConfig := circuitbreaker.Config{
    MaxRequests: 5,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(c Counts) bool {
        return c.ConsecutiveFailures >= 10  // More tolerant
    },
}
```

### 5. Combine with Retry Logic

```go
// Retry up to 3 times with exponential backoff
for attempt := 1; attempt <= 3; attempt++ {
    err := cb.Execute(func() error {
        return callService()
    })
    
    if err == nil {
        return nil  // Success
    }
    
    if err == circuitbreaker.ErrCircuitOpen {
        return err  // Don't retry if circuit is open
    }
    
    // Exponential backoff
    time.Sleep(time.Duration(attempt*attempt) * time.Second)
}
```

---

## 🤔 FAQ

### Q: When should I use Circuit Breaker?

**A:** Use it when:
- Calling external HTTP APIs
- Calling downstream microservices
- Connecting to databases
- Any operation that can fail and you want to fail fast

### Q: Circuit Breaker vs Retry Pattern?

**A:** They work together:
- **Retry**: Try again a few times with backoff
- **Circuit Breaker**: Stop trying after repeated failures

```go
// Good: Combine both
for i := 0; i < 3; i++ {
    err := circuitBreaker.Execute(callService)
    if err == nil || err == circuitbreaker.ErrCircuitOpen {
        break
    }
    time.Sleep(backoff)
}
```

### Q: How do I choose failure thresholds?

**A:** Consider:
- **Service Criticality**: Critical → Lower threshold (3-5 failures)
- **Expected Failure Rate**: If normally 90% success → Trip at 70% success
- **Recovery Time**: How long does service take to recover?

### Q: Should I use one circuit breaker for all endpoints?

**A:** No! Use separate circuit breakers for:
- Different services
- Different endpoints (if they have different reliability)
- Read vs Write operations

```go
getUserCB := circuitbreaker.New("get-user", config)
createOrderCB := circuitbreaker.New("create-order", config)
```

---

## 🎓 Learning Outcomes

After studying this implementation, you'll understand:

- ✅ **Circuit Breaker Pattern** and when to use it
- ✅ **State Machine** implementation in Go
- ✅ **Thread Safety** with mutexes
- ✅ **Failure Detection** strategies
- ✅ **Metrics Collection** with Prometheus
- ✅ **Resilience Patterns** in microservices
- ✅ **Graceful Degradation** techniques

---

## 📖 References

- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Microsoft - Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Netflix Hystrix](https://github.com/Netflix/Hystrix/wiki/How-it-Works)

---

## 🚧 Implementation Status

### ✅ Completed Features

- [x] **Slow call detection** - `ExecuteWithTimeout()` and `SlowCallDetector`
- [x] **Context support** - `ExecuteWithContext()` for cancellation/timeout
- [x] **Fallback patterns** - `ExecuteWithFallback()` with generics support
- [x] **Sliding window** - Time-based failure rate calculation
- [x] **HTTP middleware** - Server and client-side protection
- [x] **gRPC interceptors** - Client and server interceptors

### 🔜 Future Enhancements

- [ ] Bulkhead pattern integration
- [ ] Rate limiting
- [ ] Redis-based distributed circuit breaker

---

## 🔬 Deep-Dive: Implementation Details

### Cấu trúc State Machine (Máy trạng thái)

Circuit breaker sử dụng **generation-based state machine** để tránh race conditions:

```go
type CircuitBreaker struct {
    mutex      sync.Mutex
    state      State      // Current state
    generation uint64     // Prevents stale updates
    counts     Counts     // Request statistics
    expiry     time.Time  // When current state expires
}
```

**Tại sao dùng `generation`?**

Khi một request bắt đầu ở generation N và state thay đổi trước khi request hoàn thành, kết quả của request đó không nên ảnh hưởng đến state mới:

```
Request A starts (gen=5, state=CLOSED)
   ↓
State changes to OPEN (gen=6)
   ↓
Request A completes with success
   ↓
Should NOT close circuit (gen mismatch: 5 != 6)
```

### Sliding Window Algorithm

Sliding window chia thời gian thành các bucket để tính failure rate chính xác:

```
Time: ─────────────────────────────────────────────────►
      │   B1   │   B2   │   B3   │   B4   │   B5   │
      │ 2F 3S │ 1F 4S │ 0F 5S │ 3F 2S │ 1F 4S │
      ↑───────────── 10 second window ─────────────↑
      
F = failures, S = successes
Failure rate = (2+1+0+3+1) / (5+5+5+5+5) = 7/25 = 28%
```

### Performance Benchmarks

```
BenchmarkCircuitBreaker_Closed    12,330,307    95.43 ns/op    0 B/op    0 allocs/op
BenchmarkCircuitBreaker_Open      25,189,135    47.23 ns/op    0 B/op    0 allocs/op
BenchmarkSlidingWindow_Record     13,409,461    89.41 ns/op    0 B/op    0 allocs/op
```

**Key insights:**
- **Zero allocations** - Không có garbage collection overhead
- **<100ns latency** - Gần như không ảnh hưởng đến performance
- **Open state nhanh hơn 2x** - Vì không cần thực thi request

### Thread Safety

Tất cả operations đều thread-safe với mutex:

```go
func (cb *CircuitBreaker) beforeRequest() (uint64, error) {
    cb.mutex.Lock()
    defer cb.mutex.Unlock()
    
    state, generation := cb.currentState(time.Now())
    // ...
}
```

---

## 📖 References

- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Microsoft - Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Netflix Hystrix](https://github.com/Netflix/Hystrix/wiki/How-it-Works)

---

**Happy Building Resilient Systems! 🔨**

# circuit-breaker
