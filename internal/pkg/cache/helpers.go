package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

func GetOrSet[T any](ctx context.Context, rdb *redis.Client, key string, ttl time.Duration, fn func() (T, error)) (T, error) {
	var zero T

	// Try get
	val, err := rdb.Get(ctx, key).Result()
	if err == nil {
		var result T
		if err := json.Unmarshal([]byte(val), &result); err == nil {
			return result, nil
		}
		// If unmarshal fails, we proceed to compute and overwrite
	} else if !errors.Is(err, redis.Nil) {
		// Log error? For now just proceed
	}

	// Compute
	result, err := fn()
	if err != nil {
		return zero, err
	}

	// Set
	bytes, err := json.Marshal(result)
	if err == nil {
		rdb.Set(ctx, key, bytes, ttl)
	}

	return result, nil
}

func Invalidate(ctx context.Context, rdb *redis.Client, pattern string) error {
	iter := rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := rdb.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}
