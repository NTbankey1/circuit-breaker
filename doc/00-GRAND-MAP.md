# 🗺️ GRAND MAP: Circuit Breaker Pattern Deep Dive

> **Tài liệu tổng quan kiến trúc** - Điểm khởi đầu để hiểu toàn bộ hệ thống Circuit Breaker

---

## 📚 Mục Lục

1. [First Principles: Tại sao cần Circuit Breaker?](#1-first-principles-tại-sao-cần-circuit-breaker)
2. [Architecture Overview](#2-architecture-overview)
3. [Request Lifecycle Flow](#3-request-lifecycle-flow)
4. [Component Interaction Map](#4-component-interaction-map)
5. [Cross-Reference Matrix](#5-cross-reference-matrix)

---

## 1. First Principles: Tại sao cần Circuit Breaker?

### 1.1 Vấn Đề: Cascading Failures

Trong Distributed Systems, một service chậm hoặc fail có thể gây ra **hiệu ứng domino**:

```mermaid
flowchart LR
    subgraph "Cascading Failure"
        direction TB
        A[Client] --> B[API Gateway]
        B --> C[Service A]
        C --> D["❌ Service B (Slow/Dead)"]
        
        D -.->|"Timeout 30s"| C
        C -.->|"Thread exhausted"| B
        B -.->|"Connection pool full"| A
    end
    
    style D fill:#ff6b6b,stroke:#c92a2a,color:#fff
    style C fill:#ffd43b,stroke:#e8590c
    style B fill:#ffd43b,stroke:#e8590c
```

**Vấn đề cốt lõi**:

- 🔴 **Thread starvation**: Requests chờ service chết → thread pool cạn kiệt
- 🔴 **Resource exhaustion**: Connections, memory, CPU bị hold vô ích
- 🔴 **Cascading timeout**: 1 service chậm → tất cả upstream services chậm theo

### 1.2 Electrical Analogy → Software Pattern

| Electrical Circuit Breaker | Software Circuit Breaker |
|---------------------------|-------------------------|
| Quá tải điện → cắt mạch | Quá nhiều failures → reject requests |
| Tự động đóng lại sau thời gian | Timeout → chuyển sang Half-Open |
| Bảo vệ thiết bị điện | Bảo vệ resources (threads, connections) |

```mermaid
flowchart LR
    subgraph "Electrical"
        E1[🔌 Normal Load] --> E2[⚡ Overload]
        E2 --> E3["🔴 TRIP!"]
        E3 --> E4[Wait & Reset]
    end
    
    subgraph "Software"
        S1[✅ Requests OK] --> S2[❌ Failures ↑]
        S2 --> S3["🔴 OPEN"]
        S3 --> S4[Timeout → Half-Open]
    end
    
    E1 -.-> S1
    E2 -.-> S2
    E3 -.-> S3
    E4 -.-> S4
```

### 1.3 Trade-off Triangle

```mermaid
flowchart TD
    subgraph "Trade-off Analysis"
        A["🎯 AVAILABILITY<br/>Cho phép requests đi qua"]
        B["🛡️ PROTECTION<br/>Bảo vệ downstream"]
        C["⚡ LATENCY<br/>Response time nhanh"]
        
        A <-->|"Conflict"| B
        B <-->|"Conflict"| C
        C <-->|"Conflict"| A
    end
    
    style A fill:#4dabf7,stroke:#1864ab
    style B fill:#69db7c,stroke:#2f9e44
    style C fill:#ffd43b,stroke:#e8590c
```

**Circuit Breaker giải quyết bằng cách**:

- ✅ **Fast-fail**: Reject ngay khi circuit OPEN → giảm latency
- ✅ **Graceful degradation**: Fallback thay vì error → giữ availability
- ✅ **Recovery testing**: Half-Open state → tự phục hồi khi service khỏe

---

## 2. Architecture Overview

### 2.1 Package Structure

```
circuit-breaker/
├── internal/
│   ├── circuitbreaker/
│   │   ├── breaker.go         # Core state machine
│   │   ├── state.go           # State & Counts definitions
│   │   ├── config.go          # Configuration options
│   │   ├── sliding_window.go  # Failure rate algorithm
│   │   ├── context.go         # Context-aware execution
│   │   ├── fallback.go        # Fallback strategies
│   │   └── metrics.go         # Prometheus integration
│   └── middleware/
│       ├── http_middleware.go # HTTP server/client wrappers
│       └── grpc_interceptor.go# gRPC interceptors
├── pkg/
│   └── client/
│       └── http.go            # HTTP client wrapper
└── cmd/
    └── http-example/
        └── main.go            # Demo application
```

### 2.2 Class Diagram: Component Relationships

```mermaid
classDiagram
    class CircuitBreaker {
        -name string
        -state State
        -generation uint64
        -counts Counts
        -mutex sync.Mutex
        +Execute(fn) error
        +ExecuteWithContext(ctx, fn) error
        +State() State
        +Counts() Counts
        -beforeRequest() generation, error
        -afterRequest(generation, success)
        -currentState(now) State, generation
        -setState(state, now)
        -toNewGeneration(now)
    }
    
    class Config {
        +MaxRequests uint32
        +Interval Duration
        +Timeout Duration
        +ReadyToTrip func
        +OnStateChange func
        +IsSuccessful func
    }
    
    class Counts {
        +Requests uint32
        +TotalSuccesses uint32
        +TotalFailures uint32
        +ConsecutiveSuccesses uint32
        +ConsecutiveFailures uint32
    }
    
    class State {
        <<enumeration>>
        StateClosed
        StateHalfOpen
        StateOpen
    }
    
    class SlidingWindow {
        -buckets []*Bucket
        -total windowCounts
        +Record(success bool)
        +GetCounts() requests, successes, failures
        +FailureRate() float64
        -expire(now)
        -getCurrentBucket(now) *Bucket
    }
    
    class Metrics {
        -requests CounterVec
        -failures CounterVec
        -rejections CounterVec
        -currentState GaugeVec
        +RecordSuccess(name)
        +RecordFailure(name)
        +RecordStateChange(name, from, to)
    }
    
    class HTTPMiddleware {
        -breaker *CircuitBreaker
        +Wrap(handler) Handler
    }
    
    class RoundTripper {
        -base RoundTripper
        -breaker *CircuitBreaker
        +RoundTrip(req) Response, error
    }
    
    CircuitBreaker --> Config : uses
    CircuitBreaker --> Counts : contains
    CircuitBreaker --> State : has current
    CircuitBreaker ..> SlidingWindow : optional
    CircuitBreaker ..> Metrics : reports to
    HTTPMiddleware --> CircuitBreaker : wraps
    RoundTripper --> CircuitBreaker : wraps
```

---

## 3. Request Lifecycle Flow

### 3.1 Happy Path: Circuit Closed

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant CB as CircuitBreaker
    participant Service as Downstream Service
    
    Client->>CB: Execute(fn)
    activate CB
    
    Note over CB: beforeRequest()
    CB->>CB: mutex.Lock()
    CB->>CB: Check state == CLOSED ✅
    CB->>CB: generation = currentGen
    CB->>CB: counts.Requests++
    CB->>CB: mutex.Unlock()
    
    CB->>Service: fn() - Call downstream
    activate Service
    Service-->>CB: Success ✅
    deactivate Service
    
    Note over CB: afterRequest(gen, true)
    CB->>CB: mutex.Lock()
    CB->>CB: Verify generation match
    CB->>CB: onSuccess() - Update counts
    CB->>CB: mutex.Unlock()
    
    CB-->>Client: return nil
    deactivate CB
```

### 3.2 Circuit Opens: Failure Threshold Reached

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant CB as CircuitBreaker
    participant Service as Downstream Service
    
    Client->>CB: Execute(fn)
    activate CB
    
    CB->>CB: beforeRequest() ✅
    CB->>Service: fn() - Call downstream
    activate Service
    Service-->>CB: Error ❌
    deactivate Service
    
    Note over CB: afterRequest(gen, false)
    CB->>CB: onFailure()
    CB->>CB: counts.ConsecutiveFailures++
    CB->>CB: ReadyToTrip(counts)?
    
    alt ReadyToTrip returns TRUE
        CB->>CB: setState(StateOpen)
        Note over CB: 🔴 Circuit NOW OPEN
        CB->>CB: toNewGeneration() - Reset counts
        CB->>CB: expiry = now + Timeout
    end
    
    CB-->>Client: return error
    deactivate CB
```

### 3.3 Fast-Fail: Circuit Open

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant CB as CircuitBreaker
    participant Service as Downstream Service
    
    Client->>CB: Execute(fn)
    activate CB
    
    Note over CB: beforeRequest()
    CB->>CB: mutex.Lock()
    CB->>CB: currentState(now)
    
    alt expiry.Before(now)
        Note over CB: Timeout expired!
        CB->>CB: setState(StateHalfOpen) 🟡
    else expiry NOT passed
        Note over CB: Still OPEN 🔴
        CB-->>Client: return ErrCircuitOpen
        Note right of CB: ⚡ FAST FAIL!<br/>No downstream call
    end
    
    CB->>CB: mutex.Unlock()
    deactivate CB
    
    Note over Service: Service NOT called!<br/>Resources protected ✅
```

### 3.4 Recovery: Half-Open Testing

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant CB as CircuitBreaker
    participant Service as Downstream Service
    
    Note over CB: State: HALF-OPEN 🟡<br/>MaxRequests = 3
    
    Client->>CB: Execute(fn) - Request 1
    CB->>CB: counts.Requests = 0 < 3 ✅
    CB->>Service: fn()
    Service-->>CB: Success ✅
    CB->>CB: ConsecutiveSuccesses = 1
    
    Client->>CB: Execute(fn) - Request 2
    CB->>Service: fn()
    Service-->>CB: Success ✅
    CB->>CB: ConsecutiveSuccesses = 2
    
    Client->>CB: Execute(fn) - Request 3
    CB->>Service: fn()
    Service-->>CB: Success ✅
    CB->>CB: ConsecutiveSuccesses = 3
    
    Note over CB: ConsecutiveSuccesses >= MaxRequests
    CB->>CB: setState(StateClosed) 🟢
    
    Note over CB: 🎉 Circuit RECOVERED!
```

---

## 4. Component Interaction Map

### 4.1 Data Flow Diagram

```mermaid
flowchart TB
    subgraph "Entry Points"
        HTTP[HTTP Handler]
        GRPC[gRPC Handler]
        CLIENT[HTTP Client]
    end
    
    subgraph "Middleware Layer"
        HM[HTTPMiddleware]
        GI[gRPC Interceptor]
        RT[RoundTripper]
    end
    
    subgraph "Core Engine"
        CB[CircuitBreaker]
        SW[SlidingWindow]
        CFG[Config]
    end
    
    subgraph "Observability"
        M[Metrics]
        PROM[(Prometheus)]
    end
    
    subgraph "Downstream"
        SVC[External Service]
    end
    
    HTTP --> HM
    GRPC --> GI
    CLIENT --> RT
    
    HM --> CB
    GI --> CB
    RT --> CB
    
    CB --> SW
    CB --> CFG
    CB --> M
    
    CB --> SVC
    M --> PROM
    
    style CB fill:#4dabf7,stroke:#1864ab,stroke-width:3px
    style SW fill:#69db7c,stroke:#2f9e44
    style M fill:#ffd43b,stroke:#e8590c
```

### 4.2 State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> Closed : Initialize
    
    Closed --> Open : ReadyToTrip(counts) = true
    Closed --> Closed : Success/Failure (below threshold)
    
    Open --> HalfOpen : Timeout expires
    Open --> Open : All requests rejected
    
    HalfOpen --> Closed : ConsecutiveSuccesses >= MaxRequests
    HalfOpen --> Open : Any single failure
    HalfOpen --> HalfOpen : Success (below threshold)
    
    note right of Closed
        Normal operation
        All requests pass through
        Counts tracked
    end note
    
    note right of Open
        Fast-fail mode
        ErrCircuitOpen returned
        Waiting for timeout
    end note
    
    note right of HalfOpen
        Recovery testing
        Limited requests allowed
        Single failure → back to OPEN
    end note
```

---

## 5. Cross-Reference Matrix

### 📖 Tài liệu Deep-Dive

| Document | Chủ đề | Keywords |
|----------|--------|----------|
| [01-STATE-MACHINE-INTERNALS.md](./01-STATE-MACHINE-INTERNALS.md) | FSM, Generation Counter, State Transitions | `beforeRequest`, `afterRequest`, `generation`, `TOCTOU` |
| [02-SLIDING-WINDOW-ALGORITHM.md](./02-SLIDING-WINDOW-ALGORITHM.md) | Time-based failure rate, Bucket algorithm | `SlidingWindow`, `Bucket`, `expire`, `FailureRate` |
| [03-CONCURRENCY-PATTERNS.md](./03-CONCURRENCY-PATTERNS.md) | Thread Safety, Mutex, Lock contention | `sync.Mutex`, `RWMutex`, `defer`, `panic recovery` |
| [04-MIDDLEWARE-INTEGRATION.md](./04-MIDDLEWARE-INTEGRATION.md) | HTTP/gRPC wrappers, Error classification | `HTTPMiddleware`, `RoundTripper`, `Interceptor`, `IsSuccessful` |
| [05-OBSERVABILITY.md](./05-OBSERVABILITY.md) | Prometheus, Alerting, Dashboards | `Metrics`, `CounterVec`, `GaugeVec`, `HistogramVec` |

### 🔗 Source Code Quick Links

| Component | File | Key Functions |
|-----------|------|---------------|
| Core Breaker | [breaker.go](../internal/circuitbreaker/breaker.go) | `New()`, `Execute()`, `beforeRequest()`, `afterRequest()` |
| State Types | [state.go](../internal/circuitbreaker/state.go) | `State`, `Counts`, `StateClosed`, `StateOpen` |
| Configuration | [config.go](../internal/circuitbreaker/config.go) | `Config`, `ReadyToTrip`, `OnStateChange` |
| Sliding Window | [sliding_window.go](../internal/circuitbreaker/sliding_window.go) | `SlidingWindow`, `Record()`, `FailureRate()` |
| Context Support | [context.go](../internal/circuitbreaker/context.go) | `ExecuteWithContext()`, `SlowCallDetector` |
| Fallback | [fallback.go](../internal/circuitbreaker/fallback.go) | `ExecuteWithFallback()`, `CacheFallback()` |
| Metrics | [metrics.go](../internal/circuitbreaker/metrics.go) | `Metrics`, `RecordSuccess()`, `RecordStateChange()` |
| HTTP Middleware | [http_middleware.go](../internal/middleware/http_middleware.go) | `HTTPMiddleware`, `RoundTripper` |
| gRPC Interceptor | [grpc_interceptor.go](../internal/middleware/grpc_interceptor.go) | `UnaryClientInterceptor()`, `StreamClientInterceptor()` |

---

## 🎯 Key Takeaways

> [!IMPORTANT]
> **Circuit Breaker Pattern = Fail Fast + Graceful Degradation + Self-Healing**

1. **Fail Fast**: Khi circuit OPEN, reject ngay → không lãng phí resources
2. **Graceful Degradation**: Sử dụng fallback thay vì hard error
3. **Self-Healing**: Half-Open state tự động test recovery

> [!TIP]
> **Best Practice**: Mỗi downstream service nên có circuit breaker riêng biệt. KHÔNG share một circuit breaker cho nhiều services khác nhau!

---

**Next**: [01-STATE-MACHINE-INTERNALS.md](./01-STATE-MACHINE-INTERNALS.md) - Đi sâu vào State Machine và Generation-based concurrency →
