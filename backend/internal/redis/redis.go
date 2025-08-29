package redis

import (
	"os"
	"sync"

	"github.com/redis/go-redis/v9"
)

var once sync.Once
var connection *redis.Client

func NewConnection() *redis.Client {
	once.Do(func() {
		connection = redis.NewClient(&redis.Options{
			Addr:     os.Getenv("REDIS_URL"),
			Password: "",
			DB:       0,
		})
	})

	return connection
}
