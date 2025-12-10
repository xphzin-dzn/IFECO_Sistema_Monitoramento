#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// UUIDs DEFINIDOS:
// Service UUID (Deve ser o mesmo definido no app mobile)
#define SERVICE_UUID           "0000ffe0-0000-1000-8000-00805f9b34fb"
// Characteristic UUID (Onde os dados de telemetria serão enviados via NOTIFY)
#define CHARACTERISTIC_UUID    "0000ffe1-0000-1000-8000-00805f9b34fb"

BLECharacteristic *pCharacteristic; 
bool deviceConnected = false;      

// --- CALLBACKS DE CONEXÃO ---
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("🔗 Cliente conectado.");
    }

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("❌ Cliente desconectado. Reiniciando anúncio.");
      pServer->startAdvertising(); 
    }
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Iniciando Servidor BLE...");

  // 1. Inicializar com o nome que o app mobile espera (IFECO_TELEMETRIA)
  BLEDevice::init("IFECO_TELEMETRIA"); 

  // 2. Criar o Servidor
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 3. Criar o Serviço
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 4. Criar a Característica com NOTIFY
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ |
                      BLECharacteristic::PROPERTY_WRITE |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );
  
  // Adicionar a descrição 2902
  pCharacteristic->addDescriptor(new BLE2902()); 
  pCharacteristic->setCallbacks(new BLECharacteristicCallbacks()); // Adicionar callbacks vazios
  
  // 5. Iniciar o Serviço
  pService->start();

  // 6. Configurar e Iniciar Publicidade
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("Servidor BLE pronto e anunciando...");
}

void loop() {
  if (deviceConnected) {
    // SIMULAÇÃO DE DADOS (Você pode substituir esta lógica pela leitura de sensores reais)
    static float velocidade = 0.0;
    static float bateria = 100.0;
    static float temp = 25.0;

    // Lógica de simulação de valores:
    velocidade += 0.5;
    if (velocidade > 80.0) velocidade = 5.0;
    
    bateria -= 0.05;
    if (bateria < 20.0) bateria = 100.0; 
    
    temp += (random(0, 2) == 0 ? 0.1 : -0.1);
    if (temp > 70.0) temp = 50.0; // Limite de temperatura
    if (temp < 20.0) temp = 25.0;
    

    // Formato CSV (A ordem é: velocidade, bateria, temperatura)
    char txValue[50];
    sprintf(txValue, "%.1f,%.1f,%.1f", velocidade, bateria, temp); 
    
    // Envia a notificação
    pCharacteristic->setValue(txValue);
    pCharacteristic->notify();

    Serial.print("Enviando: ");
    Serial.println(txValue);
  }
  
  // Envia a notificação a cada 500ms (duas vezes por segundo)
  delay(500); 
}