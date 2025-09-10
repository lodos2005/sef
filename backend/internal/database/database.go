package database

import (
	"fmt"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"sef/internal/bootstrap"
)

var once sync.Once
var connection *gorm.DB

func Connection() *gorm.DB {
	once.Do(func() {
		connection = initialize()
	})

	return connection
}

func initialize() *gorm.DB {
	conf, err := bootstrap.NewConf()
	if err != nil {
		return nil
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		conf.MustString("database.host"),
		conf.MustString("database.port"),
		conf.MustString("database.user"),
		conf.MustString("database.password"),
		conf.MustString("database.name"),
	)

	connection, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil
	}

	sqlDB, err := connection.DB()
	if err != nil {
		return nil
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return connection
}
