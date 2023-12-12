# Afterglow
Afterglow is a combination of different applications that makes it possible to
send DMX signals from a DAW directly to the DMX receivers using VST3 plugins. 
This requires three different pieces of software that communicate with each other.

## VST v1.1.1
The `afterglow` VST3 plugin, which connects to the server as a client.
The DMX signals can be created using DAW automation, for example.

### Build
Navigate to the `vst/` directory.
```shell
cd vst/
```

Build the VST3 in the `target/bundled/` directory using the following command.
```shell
cargo xtask bundle afterglow --release
```

## CLI v1.1.0
The command line interface for the `afterglow` server.
This server serves as a bridge between the VST3 plugin and the arduino software.

### Run
Navigate to the 'cli/' direcotry.
```shell
cd cli/
```

Initialize the `afterglow` server using the following command.
```shell
node main.js
```

The server can be configured using the prompts in the beginning.

#### Flags
###### --yes, -y
Skip all prompts and use the default values.

###### --quiet, -q
Only print warnings and panics.

## ARD v1.0.0
The Arduino software, which receives the packets from the server via serial and forwards them to the DMX output.

### Wiring
The value in the range of 0 to 255 is sent to the respective DMX channel via PIN 3. The MAX 485 board receives
5 volts at the DE/RE/VCC connections, with GND connected to the negative pole. The two pins A and B, along with
GND, are connected to the DMX socket.
The software uses PIN 3 as output by default, but this can be changed by adjusting the code.
#### Reference
[Arduino DmxSimple Connection](https://www.kreativekiste.de/images/arduino-projekte/DMX/arduino_dmx_dmxsimple_anschluss_tutorial.jpg)


### Build & Upload
Navigate to the `ard/main/` directory.
```shell
cd ard/main/
```

Open the `main.ino` file in the `Arduino IDE`.
Make sure to include the `DmxSimple` library, then upload the sketch.
