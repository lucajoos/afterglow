#include <DmxSimple.h>

void setup() {
  Serial.begin(9600);
}

int value = 0;
int channel;

void loop() {
  int c;

  while(!Serial.available());
  c = Serial.read();
  if ((c>='0') && (c<='9')) {
    value = 10*value + c - '0';
  } else {
    if (c=='c') channel = value;
    else if (c=='w') {
      DmxSimple.write(channel, value);
      Serial.println();
    }
    value = 0;
  }
}
