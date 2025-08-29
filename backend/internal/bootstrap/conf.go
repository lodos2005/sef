package bootstrap

import (
	"sef/pkg/config"
)

func NewConf() (*config.Config, error) {
	return config.Load()
}
