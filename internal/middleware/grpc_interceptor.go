package middleware

import (
	"context"

	"github.com/ntbankey/circuit-breaker/internal/circuitbreaker"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// GRPCInterceptorConfig configures the gRPC interceptor
type GRPCInterceptorConfig struct {
	// CircuitBreaker to use
	Breaker *circuitbreaker.CircuitBreaker

	// Metrics for recording request stats
	Metrics *circuitbreaker.Metrics

	// IsSuccessful determines if an error is considered successful
	// Defaults to: nil error or codes.OK
	IsSuccessful func(err error) bool
}

// UnaryClientInterceptor returns a gRPC client interceptor that wraps calls
// with circuit breaker protection
func UnaryClientInterceptor(config GRPCInterceptorConfig) grpc.UnaryClientInterceptor {
	if config.IsSuccessful == nil {
		config.IsSuccessful = defaultGRPCIsSuccessful
	}

	return func(
		ctx context.Context,
		method string,
		req, reply interface{},
		cc *grpc.ClientConn,
		invoker grpc.UnaryInvoker,
		opts ...grpc.CallOption,
	) error {
		err := config.Breaker.Execute(func() error {
			err := invoker(ctx, method, req, reply, cc, opts...)
			if !config.IsSuccessful(err) {
				return err
			}
			return nil
		})

		// Convert circuit breaker errors to gRPC status
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

		// Record metrics
		if config.Metrics != nil {
			if err == nil {
				config.Metrics.RecordSuccess(config.Breaker.Name())
			} else {
				config.Metrics.RecordFailure(config.Breaker.Name())
			}
		}

		return err
	}
}

// StreamClientInterceptor returns a gRPC stream client interceptor
func StreamClientInterceptor(config GRPCInterceptorConfig) grpc.StreamClientInterceptor {
	if config.IsSuccessful == nil {
		config.IsSuccessful = defaultGRPCIsSuccessful
	}

	return func(
		ctx context.Context,
		desc *grpc.StreamDesc,
		cc *grpc.ClientConn,
		method string,
		streamer grpc.Streamer,
		opts ...grpc.CallOption,
	) (grpc.ClientStream, error) {
		var stream grpc.ClientStream

		err := config.Breaker.Execute(func() error {
			var err error
			stream, err = streamer(ctx, desc, cc, method, opts...)
			if !config.IsSuccessful(err) {
				return err
			}
			return nil
		})

		// Convert circuit breaker errors to gRPC status
		if err == circuitbreaker.ErrCircuitOpen {
			if config.Metrics != nil {
				config.Metrics.RecordRejection(config.Breaker.Name())
			}
			return nil, status.Error(codes.Unavailable, "circuit breaker is open")
		}

		if err == circuitbreaker.ErrTooManyRequests {
			if config.Metrics != nil {
				config.Metrics.RecordRejection(config.Breaker.Name())
			}
			return nil, status.Error(codes.ResourceExhausted, "too many requests")
		}

		// Record metrics
		if config.Metrics != nil {
			if err == nil {
				config.Metrics.RecordSuccess(config.Breaker.Name())
			} else {
				config.Metrics.RecordFailure(config.Breaker.Name())
			}
		}

		return stream, err
	}
}

// UnaryServerInterceptor returns a gRPC server interceptor for protecting
// downstream calls made by the handler
func UnaryServerInterceptor(config GRPCInterceptorConfig) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		// Check circuit state before handling
		if config.Breaker.State() == circuitbreaker.StateOpen {
			if config.Metrics != nil {
				config.Metrics.RecordRejection(config.Breaker.Name())
			}
			return nil, status.Error(codes.Unavailable, "service temporarily unavailable")
		}

		var resp interface{}
		err := config.Breaker.Execute(func() error {
			var err error
			resp, err = handler(ctx, req)
			return err
		})

		// Record metrics
		if config.Metrics != nil {
			if err == nil {
				config.Metrics.RecordSuccess(config.Breaker.Name())
			} else {
				config.Metrics.RecordFailure(config.Breaker.Name())
			}
		}

		return resp, err
	}
}

// defaultGRPCIsSuccessful considers nil errors and certain codes as successful
func defaultGRPCIsSuccessful(err error) bool {
	if err == nil {
		return true
	}

	// Get gRPC status code
	st, ok := status.FromError(err)
	if !ok {
		return false
	}

	// These codes indicate client errors, not service failures
	switch st.Code() {
	case codes.OK:
		return true
	case codes.Canceled:
		return true // Client cancelled, not a service failure
	case codes.InvalidArgument:
		return true // Client error
	case codes.NotFound:
		return true // Resource not found, not a service failure
	case codes.AlreadyExists:
		return true // Client error
	case codes.PermissionDenied:
		return true // Auth error
	case codes.Unauthenticated:
		return true // Auth error
	default:
		return false // Server errors
	}
}
