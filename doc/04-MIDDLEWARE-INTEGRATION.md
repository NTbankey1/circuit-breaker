# 🔌 MIDDLEWARE INTEGRATION: HTTP & gRPC Patterns

> **Deep Dive**: Decorator pattern cho HTTP handlers, RoundTripper, và gRPC Interceptors

---

## 📚 Mục Lục

1. [First Principles: Middleware Pattern](#1-first-principles-middleware-pattern)
2. [HTTP Middleware Architecture](#2-http-middleware-architecture)
3. [HTTP Client (RoundTripper)](#3-http-client-roundtripper)
4. [gRPC Interceptors](#4-grpc-interceptors)
5. [Error Classification](#5-error-classification)
6. [Integration Patterns](#6-integration-patterns)

---

## 1. First Principles: Middleware Pattern

### 1.1 Decorator Pattern in Go

**Middleware** là một loại **Decorator Pattern** - wrap một handler để thêm behavior mà không modify handler gốc.

```mermaid
flowchart LR
    subgraph "Without Middleware"
        REQ1[Request] --> H1[Handler]
        H1 --> RES1[Response]
    end
    
    subgraph "With Middleware"
        REQ2[Request] --> M1[Logging]
        M1 --> M2[Auth]
        M2 --> M3[Circuit Breaker]
        M3 --> H2[Handler]
        H2 --> M3
        M3 --> M2
        M2 --> M1
        M1 --> RES2[Response]
    end
    
    style M3 fill:#4dabf7,stroke:#1864ab,stroke-width:3px
```

### 1.2 Go Interface Contracts

```go
// HTTP Server middleware: func(http.Handler) http.Handler
type Middleware func(http.Handler) http.Handler

// HTTP Client middleware: http.RoundTripper
type RoundTripper interface {
    RoundTrip(*http.Request) (*http.Response, error)
}

// gRPC Client: UnaryClientInterceptor
type UnaryClientInterceptor func(
    ctx context.Context,
    method string,
    req, reply interface{},
    cc *ClientConn,
    invoker UnaryInvoker,
    opts ...CallOption,
) error
```

### 1.3 Request Interception Points

```mermaid
flowchart TB
    subgraph "HTTP Server"
        HS1["Incoming Request"]
        HS2["Middleware: Before"]
        HS3["Handler"]
        HS4["Middleware: After"]
        HS5["Response"]
        
        HS1 --> HS2 --> HS3 --> HS4 --> HS5
    end
    
    subgraph "HTTP Client"
        HC1["Outgoing Request"]
        HC2["RoundTripper: Before"]
        HC3["Actual HTTP Call"]
        HC4["RoundTripper: After"]
        HC5["Response to Caller"]
        
        HC1 --> HC2 --> HC3 --> HC4 --> HC5
    end
    
    subgraph "gRPC"
        G1["Client Call"]
        G2["Interceptor: Before"]
        G3["Server Handler"]
        G4["Interceptor: After"]
        G5["Response"]
        
        G1 --> G2 --> G3 --> G4 --> G5
    end
    
    style HS2 fill:#69db7c,stroke:#2f9e44
    style HS4 fill:#69db7c,stroke:#2f9e44
    style HC2 fill:#4dabf7,stroke:#1864ab
    style HC4 fill:#4dabf7,stroke:#1864ab
    style G2 fill:#ffd43b,stroke:#e8590c
    style G4 fill:#ffd43b,stroke:#e8590c
```

---

## 2. HTTP Middleware Architecture

### 2.1 HTTPMiddleware Class Diagram

```mermaid
classDiagram
    class HTTPMiddleware {
        -config HTTPMiddlewareConfig
        +Wrap(next Handler) Handler
        +WrapFunc(next HandlerFunc) Handler
        +Handler(next Handler) Handler
    }
    
    class HTTPMiddlewareConfig {
        +Breaker *CircuitBreaker
        +Metrics *Metrics
        +OnCircuitOpen func(w, r)
        +IsSuccessful func(status int) bool
    }
    
    class responseWriter {
        +ResponseWriter
        +statusCode int
        +written bool
        +WriteHeader(code int)
        +Write(b []byte) int, error
    }
    
    HTTPMiddleware --> HTTPMiddlewareConfig : uses
    HTTPMiddleware ..> responseWriter : creates
```

### 2.2 Request Flow Through Middleware

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant MW as HTTPMiddleware
    participant CB as CircuitBreaker
    participant Handler
    participant Downstream as Downstream Service
    
    Client->>MW: HTTP Request
    
    MW->>CB: Check State()
    
    alt Circuit OPEN
        CB-->>MW: StateOpen
        MW->>Client: 503 Service Unavailable<br/>{"error": "service temporarily unavailable"}
        Note over MW,Client: FAST FAIL!<br/>Handler NOT called
    else Circuit CLOSED/HALF-OPEN
        CB-->>MW: StateClosed/StateHalfOpen
        
        MW->>MW: Create responseWriter wrapper
        MW->>CB: Execute(func)
        
        activate CB
        CB->>Handler: next.ServeHTTP(wrapped, r)
        Handler->>Downstream: Actual business logic
        Downstream-->>Handler: Response
        Handler-->>CB: Set status code
        
        CB->>CB: Check IsSuccessful(status)
        
        alt Status 2xx/3xx
            CB->>CB: afterRequest(gen, true)
        else Status 4xx/5xx
            CB->>CB: afterRequest(gen, false)
        end
        deactivate CB
        
        MW-->>Client: Response with status
    end
```

### 2.3 responseWriter Interception

**Problem**: Standard `http.ResponseWriter` doesn't expose the status code after `WriteHeader()`.

**Solution**: Wrap it to capture the status code.

```go
// internal/middleware/http_middleware.go:99-119
type responseWriter struct {
    http.ResponseWriter
    statusCode int
    written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
    if !rw.written {
        rw.statusCode = code
        rw.written = true
        rw.ResponseWriter.WriteHeader(code)
    }
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    if !rw.written {
        rw.WriteHeader(http.StatusOK)  // Default if not explicitly set
    }
    return rw.ResponseWriter.Write(b)
}
```

```mermaid
flowchart TB
    subgraph "Status Capture Flow"
        H["Handler calls WriteHeader(500)"]
        H --> RW["responseWriter.WriteHeader(500)"]
        RW --> SAVE["statusCode = 500<br/>written = true"]
        SAVE --> REAL["ResponseWriter.WriteHeader(500)"]
        
        CHECK["After handler: check rw.statusCode"]
        CHECK --> DECIDE{"statusCode >= 400?"}
        DECIDE -->|"Yes"| FAIL["Record as FAILURE"]
        DECIDE -->|"No"| SUCCESS["Record as SUCCESS"]
    end
    
    style SAVE fill:#ffd43b,stroke:#e8590c
```

### 2.4 Default Circuit Open Handler

```go
// internal/middleware/http_middleware.go:131-136
func defaultCircuitOpenHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Retry-After", "30")  // ← Hint for clients
    w.WriteHeader(http.StatusServiceUnavailable)  // 503
    w.Write([]byte(`{"error":"service temporarily unavailable","retry_after":30}`))
}
```

---

## 3. HTTP Client (RoundTripper)

### 3.1 RoundTripper Interface

```mermaid
classDiagram
    class RoundTripper {
        <<interface>>
        +RoundTrip(req *Request) *Response, error
    }
    
    class DefaultTransport {
        +RoundTrip(req *Request) *Response, error
    }
    
    class CircuitBreakerRoundTripper {
        -base RoundTripper
        -breaker *CircuitBreaker
        -metrics *Metrics
        +RoundTrip(req *Request) *Response, error
    }
    
    RoundTripper <|.. DefaultTransport
    RoundTripper <|.. CircuitBreakerRoundTripper
    CircuitBreakerRoundTripper --> RoundTripper : wraps
```

### 3.2 Client-Side Circuit Breaking Flow

```mermaid
flowchart TB
    START["http.Client.Get(url)"]
    START --> RT["RoundTripper.RoundTrip(req)"]
    
    RT --> EXEC["cb.Execute(func)"]
    
    EXEC --> CHECK{"Circuit state?"}
    
    CHECK -->|"OPEN"| REJECT["Return ErrCircuitOpen"]
    
    CHECK -->|"CLOSED/HALF-OPEN"| CALL["base.RoundTrip(req)"]
    CALL --> RESULT{"Response?"}
    
    RESULT -->|"Error (timeout, connection refused)"| FAIL["Return error<br/>Circuit counts failure"]
    
    RESULT -->|"Response received"| STATUS{"status >= 500?"}
    STATUS -->|"Yes (5xx)"| SERVER_ERR["Return httpError<br/>Circuit counts failure"]
    STATUS -->|"No"| SUCCESS["Return response<br/>Circuit counts success"]
    
    style REJECT fill:#ff6b6b,stroke:#c92a2a
    style FAIL fill:#ff6b6b,stroke:#c92a2a
    style SERVER_ERR fill:#ff6b6b,stroke:#c92a2a
    style SUCCESS fill:#69db7c,stroke:#2f9e44
```

### 3.3 Code Walkthrough

```go
// internal/middleware/http_middleware.go:163-197
func (rt *RoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
    var resp *http.Response

    start := time.Now()
    err := rt.breaker.Execute(func() error {
        var err error
        resp, err = rt.base.RoundTrip(req)  // ← Actual HTTP call
        if err != nil {
            return err  // Connection error → FAILURE
        }

        // 5xx = Server error → FAILURE
        if resp.StatusCode >= 500 {
            return &httpError{statusCode: resp.StatusCode}
        }
        return nil  // 2xx, 3xx, 4xx → SUCCESS
    })

    duration := time.Since(start).Seconds()

    // Record metrics
    if rt.metrics != nil {
        if err == nil {
            rt.metrics.RecordSuccess(rt.breaker.Name())
            rt.metrics.RecordDuration(rt.breaker.Name(), "success", duration)
        } else if err == circuitbreaker.ErrCircuitOpen {
            rt.metrics.RecordRejection(rt.breaker.Name())
        } else {
            rt.metrics.RecordFailure(rt.breaker.Name())
            rt.metrics.RecordDuration(rt.breaker.Name(), "failure", duration)
        }
    }

    return resp, err
}
```

---

## 4. gRPC Interceptors

### 4.1 Interceptor Types

```mermaid
flowchart TB
    subgraph "Client Interceptors"
        UC["UnaryClientInterceptor<br/>Single request/response"]
        SC["StreamClientInterceptor<br/>Streaming connections"]
    end
    
    subgraph "Server Interceptors"
        US["UnaryServerInterceptor<br/>Protect handler"]
    end
    
    subgraph "Use Cases"
        UC --> UC_USE["Call microservice APIs"]
        SC --> SC_USE["Real-time streams"]
        US --> US_USE["Protect downstream dependencies"]
    end
```

### 4.2 UnaryClientInterceptor Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as gRPC Client
    participant Interceptor as Circuit Interceptor
    participant CB as CircuitBreaker
    participant Server as gRPC Server
    
    Client->>Interceptor: Call Method(ctx, req)
    
    Interceptor->>CB: Execute(func)
    
    alt Circuit OPEN
        CB-->>Interceptor: ErrCircuitOpen
        Interceptor-->>Client: status.Error(codes.Unavailable,<br/>"circuit breaker is open")
    else Circuit allows
        CB->>Server: invoker(ctx, method, req, reply, cc)
        
        alt Success
            Server-->>CB: nil
            CB-->>Interceptor: nil
            Interceptor-->>Client: reply, nil
        else Server Error
            Server-->>CB: error
            CB->>CB: Count as failure
            CB-->>Interceptor: error
            Interceptor-->>Client: error
        end
    end
```

### 4.3 gRPC Error Code Mapping

```go
// internal/middleware/grpc_interceptor.go:49-61
if err == circuitbreaker.ErrCircuitOpen {
    if config.Metrics != nil {
        config.Metrics.RecordRejection(config.Breaker.Name())
    }
    return status.Error(codes.Unavailable, "circuit breaker is open")
}

if err == circuitbreaker.ErrTooManyRequests {
    if config.Metrics != nil {
        config.Metrics.RecordRejection(config.Breaker.Name())
    }
    return status.Error(codes.ResourceExhausted, "too many requests")
}
```

### 4.4 Stream Interceptor Specifics

```mermaid
sequenceDiagram
    participant Client
    participant Interceptor
    participant CB as CircuitBreaker
    participant Server
    
    Client->>Interceptor: OpenStream()
    
    Interceptor->>CB: Execute(func)
    
    alt Circuit OPEN
        CB-->>Client: codes.Unavailable
    else Circuit allows
        CB->>Server: streamer(ctx, desc, cc, method)
        Server-->>CB: Stream handle
        CB-->>Client: Stream handle
        
        Note over Client,Server: Stream messages flow<br/>Circuit only checked at OPEN time
    end
```

**Key Insight**: Stream interceptor chỉ check circuit khi **mở stream**, không check mỗi message trong stream.

---

## 5. Error Classification

### 5.1 HTTP Status Code Strategy

```mermaid
flowchart TB
    subgraph "HTTP Status Classification"
        S2["2xx Success"] --> OK["✅ SUCCESS"]
        S3["3xx Redirect"] --> OK
        S4["4xx Client Error"] --> CLIENT["🤔 Depends on config"]
        S5["5xx Server Error"] --> FAIL["❌ FAILURE"]
    end
    
    subgraph "Default: IsSuccessful"
        DEFAULT["status >= 200 && status < 400"]
    end
    
    style OK fill:#69db7c,stroke:#2f9e44
    style FAIL fill:#ff6b6b,stroke:#c92a2a
    style CLIENT fill:#ffd43b,stroke:#e8590c
```

**Default Implementation**:

```go
// internal/middleware/http_middleware.go:139-141
func defaultIsSuccessful(status int) bool {
    return status >= 200 && status < 400
}
```

### 5.2 gRPC Error Code Strategy

```go
// internal/middleware/grpc_interceptor.go:167-196
func defaultGRPCIsSuccessful(err error) bool {
    if err == nil {
        return true
    }

    st, ok := status.FromError(err)
    if !ok {
        return false  // Unknown error → FAILURE
    }

    // These codes indicate CLIENT errors, not service failures
    switch st.Code() {
    case codes.OK:
        return true
    case codes.Canceled:       // Client cancelled
        return true
    case codes.InvalidArgument:// Bad request
        return true
    case codes.NotFound:       // Resource not found
        return true
    case codes.AlreadyExists:  // Duplicate
        return true
    case codes.PermissionDenied: // Auth error
        return true
    case codes.Unauthenticated:  // Auth error
        return true
    default:
        return false  // Server errors → FAILURE
    }
}
```

### 5.3 Error Classification Matrix

| Error Type | HTTP | gRPC | Trip Circuit? |
|------------|------|------|---------------|
| Success | 200-299 | OK | No ✅ |
| Bad Request | 400 | InvalidArgument | No (client fault) |
| Unauthorized | 401 | Unauthenticated | No (client fault) |
| Not Found | 404 | NotFound | No (expected) |
| Rate Limited | 429 | ResourceExhausted | Maybe 🤔 |
| Server Error | 500 | Internal | Yes ❌ |
| Service Unavailable | 503 | Unavailable | Yes ❌ |
| Timeout | - | DeadlineExceeded | Yes ❌ |
| Connection Refused | - | Unavailable | Yes ❌ |

---

## 6. Integration Patterns

### 6.1 Per-Service Circuit Breakers

```mermaid
flowchart TB
    subgraph "API Gateway"
        GW[Gateway Handler]
    end
    
    subgraph "Circuit Breakers"
        CB_AUTH["CB: auth-service"]
        CB_USER["CB: user-service"]
        CB_PAYMENT["CB: payment-service"]
    end
    
    subgraph "Microservices"
        AUTH[Auth Service]
        USER[User Service]
        PAYMENT[Payment Service]
    end
    
    GW --> CB_AUTH --> AUTH
    GW --> CB_USER --> USER
    GW --> CB_PAYMENT --> PAYMENT
    
    style CB_AUTH fill:#4dabf7,stroke:#1864ab
    style CB_USER fill:#4dabf7,stroke:#1864ab
    style CB_PAYMENT fill:#4dabf7,stroke:#1864ab
```

**Code Example**:

```go
// ✅ CORRECT: Separate circuit breaker per service
authClient := client.NewHTTPClient("auth-service", authConfig, metrics)
userClient := client.NewHTTPClient("user-service", userConfig, metrics)
paymentClient := client.NewHTTPClient("payment-service", paymentConfig, metrics)

// ❌ WRONG: Single shared circuit breaker
sharedCB := circuitbreaker.New("all-services", config)
// If auth-service fails, payment-service also blocked!
```

### 6.2 Anti-Pattern: Global Circuit Breaker

```mermaid
flowchart TB
    subgraph "❌ ANTI-PATTERN"
        SHARED["Shared Circuit Breaker"]
        
        S1["Auth Service (healthy)"]
        S2["User Service (failing)"]
        S3["Payment Service (healthy)"]
        
        SHARED --> S1
        SHARED --> S2
        SHARED --> S3
        
        PROBLEM["User Service failures<br/>trip circuit for ALL services!"]
    end
    
    style PROBLEM fill:#ff6b6b,stroke:#c92a2a
    style SHARED fill:#ffd43b,stroke:#e8590c
```

### 6.3 Middleware Chaining Order

```go
// Order matters! Circuit breaker should be OUTER layer
handler := loggingMiddleware(
    authMiddleware(
        circuitBreakerMiddleware(  // ← Check circuit FIRST
            rateLimitMiddleware(
                actualHandler,
            ),
        ),
    ),
)
```

```mermaid
flowchart LR
    REQ[Request] --> LOG[Logging]
    LOG --> AUTH[Auth]
    AUTH --> CB[Circuit Breaker]
    CB --> RL[Rate Limit]
    RL --> H[Handler]
    
    style CB fill:#4dabf7,stroke:#1864ab,stroke-width:3px
```

### 6.4 HTTPClient Wrapper Usage

```go
// pkg/client/http.go usage
func main() {
    metrics := circuitbreaker.NewMetrics("demo")
    
    config := circuitbreaker.Config{
        MaxRequests: 3,
        Timeout:     5 * time.Second,
        ReadyToTrip: func(counts circuitbreaker.Counts) bool {
            return counts.ConsecutiveFailures > 5
        },
    }
    
    // Create protected HTTP client
    httpClient := client.NewHTTPClient("payment-api", config, metrics)
    
    // Use like standard http.Client
    resp, err := httpClient.Get("https://api.payment.com/charge")
    if err == circuitbreaker.ErrCircuitOpen {
        // Fallback logic
        return useCachedPaymentStatus()
    }
}
```

---

## 🔗 Related Documents

- **Previous**: [03-CONCURRENCY-PATTERNS.md](./03-CONCURRENCY-PATTERNS.md) - Thread Safety
- **Next**: [05-OBSERVABILITY.md](./05-OBSERVABILITY.md) - Prometheus Metrics

---

## 🎯 Key Takeaways

> [!IMPORTANT]
> **Per-service circuit breakers** là bắt buộc. KHÔNG BAO GIỜ share một circuit breaker cho nhiều downstream services khác nhau.

> [!TIP]
> **HTTP 4xx vs 5xx**: 4xx là client errors (không nên trip circuit), 5xx là server errors (nên trip circuit). Customize `IsSuccessful` nếu cần behavior khác.

> [!NOTE]
> **gRPC Stream**: Circuit chỉ được check khi **mở stream**, không check mỗi message. Nếu cần protection per-message, implement riêng.

> [!WARNING]
> **Middleware order matters**: Circuit breaker nên là outer layer để có thể fast-fail trước khi các middleware khác xử lý.
