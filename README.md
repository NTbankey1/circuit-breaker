# **🔨 Go Circuit Breaker**

A comprehensive, thread-safe, and production-ready implementation of the **Circuit Breaker Pattern** in Go. Designed to build resilient microservices by preventing cascading failures and providing graceful degradation.

## **📋 Table of Contents**

* [Overview](https://www.google.com/search?q=%23overview)  
* [Architecture](https://www.google.com/search?q=%23architecture)  
* [Installation](https://www.google.com/search?q=%23installation)  
* [Quick Start](https://www.google.com/search?q=%23quick-start)  
* [Configuration](https://www.google.com/search?q=%23configuration)  
* [Advanced Concepts](https://www.google.com/search?q=%23advanced-concepts)  
* [Metrics & Monitoring](https://www.google.com/search?q=%23metrics--monitoring)  
* [Internals & Performance](https://www.google.com/search?q=%23internals--performance)  
* [Best Practices](https://www.google.com/search?q=%23best-practices)  
* [Roadmap](https://www.google.com/search?q=%23roadmap)

## **🎯 Overview**

The Circuit Breaker pattern prevents an application from repeatedly attempting an operation that's likely to fail, allowing it to continue without waiting for the fault to be fixed or wasting CPU cycles.

### **Key Features**

* ✅ **Three States**: Closed, Open, Half-Open state management.  
* ✅ **Thread-Safe**: Fully safe for concurrent use in high-throughput systems.  
* ✅ **Sliding Window**: Time-based failure rate calculation for accuracy.  
* ✅ **Zero Overhead**: Extremely low latency (\<100ns) and zero-allocation operations in the hot path.  
* ✅ **Observability**: Built-in Prometheus metrics.  
* ✅ **Flexible Strategies**: Trip on consecutive failures, error rate, or slow calls.  
* ✅ **Context Aware**: Support for context.Context (cancellation/timeout).

## **🏗️ Architecture**

### **State Machine**

The circuit breaker operates as a finite state machine:  
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
![Pattern CircuitBreaker](/home/ntbankey/Documents/LEARNING-SYSTEM/05-PROJECTS/03-distributed-systems/circuit-breaker/Pattern.png)
1. **🟢 CLOSED**: Requests pass through. Success/Failure counts are tracked.  
2. **🔴 OPEN**: Request fails immediately with ErrCircuitOpen. No external calls are made.  
3. **🟡 HALF-OPEN**: After a timeout, a limited number of "probe" requests are allowed to check if the underlying service has recovered.

## **📦 Installation**

To get started, clone the repository to run the examples or use go get to include it in your project.  
\# Option 1: Integrate into your Go project  
go get \[github.com/NTbankey1/circuit-breaker\](https://github.com/NTbankey1/circuit-breaker)

\# Option 2: Clone and run examples (HTTP client example)  
git clone \[https://github.com/NTbankey1/circuit-breaker\](https://github.com/NTbankey1/circuit-breaker)  
cd circuit-breaker

\# Download dependencies  
go mod download

\# Run the HTTP example (assuming it's in cmd/http-example/main.go)  
go run cmd/http-example/main.go

## **🚀 Quick Start**

### **Basic Usage**

package main

import (  
    "fmt"  
    "time"  
    "\[github.com/NTbankey1/circuit-breaker\](https://github.com/NTbankey1/circuit-breaker)" // Import the library  
)

func main() {  
    // 1\. Configure the circuit breaker  
    config := circuitbreaker.Config{  
        MaxRequests: 3,               // Allow 3 requests in Half-Open  
        Timeout:     5 \* time.Second, // Cooldown period before trying to recover  
        ReadyToTrip: func(counts circuitbreaker.Counts) bool {  
            // Trip if 5 consecutive failures occur  
            return counts.ConsecutiveFailures \> 5  
        },  
    }  
      
    // 2\. Create the instance  
    cb := circuitbreaker.New("my-service", config)  
      
    // 3\. Execute code protected by the breaker  
    err := cb.Execute(func() error {  
        // Your logic here (e.g., HTTP call, DB query)  
        return callExternalService()  
    })  
      
    if err \== circuitbreaker.ErrCircuitOpen {  
        // Handle the open state (e.g., return cached data)  
        fmt.Println("Circuit is open, skipping request")  
    } else if err \!= nil {  
        fmt.Printf("Request failed: %v\\n", err)  
    }  
}

## **⚙️ Configuration**

The library offers granular control over behavior via the Config struct.  
config := circuitbreaker.Config{  
    // \--- Half-Open State \---  
    // Number of requests allowed to pass when in Half-Open state.  
    MaxRequests: 3,  
      
    // \--- Closed State \---  
    // Interval to reset counts in Closed state (if not using sliding window).  
    Interval: 10 \* time.Second,  
      
    // \--- Open State \---  
    // Time to wait before switching from Open to Half-Open.  
    Timeout: 60 \* time.Second,  
      
    // \--- Failure Strategy \---  
    // Function to determine when to trip the circuit.  
    ReadyToTrip: func(counts circuitbreaker.Counts) bool {  
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)  
        // Trip if 5+ failures AND failure rate \>= 60%  
        return counts.Requests \>= 10 && failureRatio \>= 0.6  
    },  
      
    // \--- Callbacks \---  
    OnStateChange: func(name string, from, to circuitbreaker.State) {  
        log.Printf("Circuit \[%s\] changed state: %s → %s", name, from, to)  
    },  
}

### **Common Presets**

* **Conservative**: High threshold, short timeout (Prioritize Availability).  
* **Aggressive**: Low threshold, long timeout (Prioritize System Protection).

## **📊 Metrics & Monitoring**

This library exports standard **Prometheus** metrics to help you visualize system health.  
\# Example Metrics Output  
circuit\_breaker\_requests\_total{name="my-service"} 150  
circuit\_breaker\_failures\_total{name="my-service"} 30  
circuit\_breaker\_state{name="my-service"} 0  \# 0=Closed, 1=Half-Open, 2=Open

### **Setup**

// Register metrics collector (pseudo-code)  
prometheus.MustRegister(circuitbreaker.NewCollector(cb))

## **🔬 Internals & Performance**

### **Generation-Based State Machine**

To prevent Race Conditions without heavy locking, we use a Generation counter.  
When a request starts, it captures the current Generation. If the circuit state changes (e.g., Closed → Open) while the request is processing, the result of that request is discarded regarding state transition logic because its generation is now stale.

### **Sliding Window Algorithm**

We implement a sliding window to calculate failure rates accurately over time, rather than just absolute counts.  
Time: ─────────────────────────────────────────────────►  
      │   B1   │   B2   │   B3   │   B4   │   B5   │  
      │ 2F 3S │ 1F 4S │ 0F 5S │ 3F 2S │ 1F 4S │

### **Benchmarks**

The implementation is optimized for the hot path.  
BenchmarkCircuitBreaker\_Closed    12,330,307    95.43 ns/op    0 B/op    0 allocs/op  
BenchmarkCircuitBreaker\_Open      25,189,135    47.23 ns/op    0 B/op    0 allocs/op

## **✅ Best Practices**

1. **Always Define Fallbacks**: Never let a ErrCircuitOpen bubble up to the user without handling it (e.g., return default data, cached response, or a friendly error).  
2. **Isolate Circuits**: Do not share a single circuit breaker instance across different downstream services. Create one for AuthService, one for PaymentService, etc.  
3. **Tune Timeouts**: The Timeout (Open → Half-Open) should be long enough for the downstream service to actually recover.  
4. **Monitor**: Set up alerts for circuit\_breaker\_state changes. A flapping circuit (constantly switching states) indicates an unstable dependency.

## **🚧 Roadmap & Status**

* $$x $$  
  **Core**: Closed/Open/Half-Open states  
* $$x $$  
  **Concurrency**: Thread-safe Mutex implementation  
* $$x $$  
  **Context**: ExecuteWithContext support  
* $$x $$  
  **Sliding Window**: Accurate rate calculation  
* $$x $$  
  **Middleware**: HTTP Client/Server wrappers  
* **Distributed**: Redis-based state sharing  
* **Adaptive**: Automatic threshold tuning

## **📖 References**

* [Martin Fowler \- Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)  
* [Microsoft \- Cloud Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)

## **📄 License**

This project is licensed under the MIT License \- see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
