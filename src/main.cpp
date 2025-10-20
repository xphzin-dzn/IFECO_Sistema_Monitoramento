#include <Arduino.h>

// Teste para verificar se BLE está disponível
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("🔍 Verificando suporte BLE...");
  
  // Verificar defines de compilação
  #ifdef CONFIG_BT_ENABLED
    Serial.println("✅ CONFIG_BT_ENABLED definido");
  #else
    Serial.println("❌ CONFIG_BT_ENABLED NÃO definido");
  #endif
  
  #ifdef CONFIG_BLUEDROID_ENABLED  
    Serial.println("✅ CONFIG_BLUEDROID_ENABLED definido");
  #else
    Serial.println("❌ CONFIG_BLUEDROID_ENABLED NÃO definido");
  #endif
  
  // Tentar incluir BLE
  Serial.println("📦 Tentando carregar bibliotecas BLE...");
  
  #if defined(CONFIG_BT_ENABLED) && defined(CONFIG_BLUEDROID_ENABLED)
    #include <BLEDevice.h>
    #include <BLEUtils.h>
    #include <BLEServer.h>
    Serial.println("✅ Bibliotecas BLE incluídas com sucesso!");
  #else
    Serial.println("❌ BLE não disponível - verifique platformio.ini");
  #endif
}

void loop() {
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  delay(1000);
}