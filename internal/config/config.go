package config

import (
	"log"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	TMDB     TMDBConfig
	OMDB     OMDBConfig
	TheTVDB  TheTVDBConfig
	FCM      FCMConfig
	MovieGlu MovieGluConfig
}

type ServerConfig struct {
	Port        int    `mapstructure:"port"`
	Environment string `mapstructure:"environment"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type JWTConfig struct {
	Secret          string        `mapstructure:"secret"`
	AccessTokenTTL  time.Duration `mapstructure:"access_token_ttl"`
	RefreshTokenTTL time.Duration `mapstructure:"refresh_token_ttl"`
}

type TMDBConfig struct {
	APIKey  string `mapstructure:"api_key"`
	BaseURL string `mapstructure:"base_url"`
}

type OMDBConfig struct {
	APIKey  string `mapstructure:"api_key"`
	BaseURL string `mapstructure:"base_url"`
}

type TheTVDBConfig struct {
	APIKey  string `mapstructure:"api_key"`
	PIN     string `mapstructure:"pin"`
	BaseURL string `mapstructure:"base_url"`
}

type FCMConfig struct {
	CredentialsFile string `mapstructure:"credentials_file"`
}

type MovieGluConfig struct {
	APIKey        string `mapstructure:"api_key"`
	Authorization string `mapstructure:"authorization"`
	ClientID      string `mapstructure:"client_id"`
	Territory     string `mapstructure:"territory"`
	BaseURL       string `mapstructure:"base_url"`
}

func Load() *Config {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.environment", "development")
	viper.SetDefault("jwt.access_token_ttl", 15*time.Minute)
	viper.SetDefault("jwt.refresh_token_ttl", 168*time.Hour)
	viper.SetDefault("tmdb.base_url", "https://api.themoviedb.org/3")
	viper.SetDefault("omdb.base_url", "https://www.omdbapi.com")
	viper.SetDefault("thetvdb.base_url", "https://api4.thetvdb.com/v4")
	viper.SetDefault("movieglu.base_url", "https://api.movieglu.com")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if desired
			log.Println("Config file not found, using environment variables")
		} else {
			// Config file was found but another error was produced
			log.Fatalf("Error reading config file: %s", err)
		}
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		log.Fatalf("Unable to decode into struct: %v", err)
	}

	return &cfg
}
