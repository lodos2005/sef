package aes

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"

	"gopkg.in/yaml.v3"
)

func Encrypt(message string) (encoded string, err error) {
	var key = []byte("3t7Ca+3fFqzSpsUkqmmTMlT2eUKPlrs3+irYZ+KP0PY=")

	//Create byte array from the input string
	plainText := []byte(message)

	//Create a new AES cipher using the key
	block, err := aes.NewCipher(key)

	//IF NewCipher failed, exit:
	if err != nil {
		return
	}

	//Make the cipher text a byte array of size BlockSize + the length of the message
	cipherText := make([]byte, aes.BlockSize+len(plainText))

	//iv is the ciphertext up to the blocksize (16)
	iv := cipherText[:aes.BlockSize]
	if _, err = io.ReadFull(rand.Reader, iv); err != nil {
		return
	}

	//Encrypt the data:
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(cipherText[aes.BlockSize:], plainText)

	//Return string encoded in base64
	return base64.RawStdEncoding.EncodeToString(cipherText), err
}

func Decrypt(secure string) (decoded string, err error) {
	var key = []byte("3t7Ca+3fFqzSpsUkqmmTMlT2eUKPlrs3+irYZ+KP0PY=")

	//Remove base64 encoding:
	cipherText, err := base64.RawStdEncoding.DecodeString(secure)

	//IF DecodeString failed, exit:
	if err != nil {
		return
	}

	//Create a new AES cipher with the key and encrypted message
	block, err := aes.NewCipher(key)

	//IF NewCipher failed, exit:
	if err != nil {
		return
	}

	//IF the length of the cipherText is less than 16 Bytes:
	if len(cipherText) < aes.BlockSize {
		err = errors.New("ciphertext block size is too short")
		return
	}

	iv := cipherText[:aes.BlockSize]
	cipherText = cipherText[aes.BlockSize:]

	//Decrypt the message
	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(cipherText, cipherText)

	return string(cipherText), err
}

func updateConfigFile(key string) error {
	configPath := "config/config.yml" // adjust path as needed

	// Read existing YAML
	yamlFile, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}

	// Parse YAML
	var configMap map[string]interface{}
	if err := yaml.Unmarshal(yamlFile, &configMap); err != nil {
		return err
	}

	// Update app.key
	configMap["app"].(map[string]interface{})["key"] = key

	// Convert back to YAML
	newYaml, err := yaml.Marshal(configMap)
	if err != nil {
		return err
	}

	// Write atomically
	tempFile := configPath + ".tmp"
	if err := os.WriteFile(tempFile, newYaml, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, configPath)
}
