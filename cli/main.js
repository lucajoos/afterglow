import { SerialPort } from "serialport";
import net from "net";
import prompts from "prompts";
import { CONSTANTS} from "./constants.js";
import kleur from 'kleur';
import logUpdate from 'log-update';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js'
import args from 'args';

dayjs.extend(relativeTime);

args
    .option('version', 'Output the version number', false)
    .option('yes', 'Skip all prompts and use the default values.', false)
    .option('quiet', 'Only print warnings and panics.', false);

const flags = args.parse(process.argv, {
    version: false
});

if(flags.v || flags.version) {
    console.log(kleur.yellow(`afterglow v${CONSTANTS.VERSION}`));
    process.exit(0);
}

const log = (message) => {
    if(!flags.q && !flags.quiet) {
        console.log(` ${kleur.cyan().bold("❯")} ${message}`);
    }
};

const panic = (message) => {
    console.error(kleur.red(` ${kleur.bold("Panic:")} ${message}`));
    process.exit(1);
}

(async () => {
    const available_serial_ports = await SerialPort.list();
    
    if(available_serial_ports.length === 0) {
        panic("No serial devices available.");
    }

    console.log();

    let response = {
        host: CONSTANTS.DEFAULT_HOST,
        port: CONSTANTS.DEFAULT_PORT,
        serial_path: available_serial_ports[0].path,
        baud_rate: CONSTANTS.DEFAULT_BAUD_RATE
    }

    if(!flags.y && !flags.yes) {
        response = await prompts([
            {
                type: "text",
                name: "host",
                message: `Define a ${kleur.cyan('hostname')} for the server.`,
                initial: CONSTANTS.DEFAULT_HOST,
                validate: (value) => (new RegExp("^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])(\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]))*$").test(value) && value.length <= 255 && value.length > 0) ? true : 'The specified hostname is not valid.'
            },
            {
                type: "number",
                name: "port",
                message: `Define a ${kleur.cyan('port')} for the server.`,
                initial: CONSTANTS.DEFAULT_PORT,
                min: 0,
                max: 65353,
            },
            {
                type: "select",
                name: "serial_path",
                message: `Select a ${kleur.cyan('serial device')} as an output.`,
                initial: 0,
                choices: available_serial_ports.map((port) => ({
                    title: port.path,
                    description: `(${Object.values(port).slice(1).filter((value) => typeof value !== "undefined").map((value) => value.trim()).join(", ")})`,
                    value: port.path
                })),
            },
            {
                type: "select",
                name: "baud_rate",
                initial: CONSTANTS.BAUD_RATES.indexOf(CONSTANTS.DEFAULT_BAUD_RATE),
                message: `Select a ${kleur.cyan('baud rate')} for the serial device.`,
                choices: CONSTANTS.BAUD_RATES.map((rate) => ({
                    title: rate.toString(),
                    value: rate
                })),
            }
        ]);
    }

    if(Object.values(response).length !== 4) {
        console.log();
        panic("Did not answer every available question.");
    }

    if(!flags.y && !flags.yes && !flags.q && !flags.quiet) {
        console.log();
    }

    const server = net.createServer();
    let number_of_packages = 0;
    let time_of_last_package = new Date();
    let is_blocking_status = false;
    let is_first_note = true;
    let type_of_last_message = null;

    const status = () => {
        if(!is_blocking_status && !flags.q && !flags.quiet) {
            let number_of_sockets = Object.values(sockets).length;
            let seconds_since_last_package = Math.floor((new Date().getTime() - time_of_last_package.getTime()) / 1000);

            logUpdate(`\n ${kleur.cyan().bold("ⓘ")} ${kleur.white(` ${kleur[number_of_sockets > 0 ? 'green' : 'red']().bold(number_of_sockets)} Socket${number_of_sockets !== 1 ? 's' : ''}, ${kleur[number_of_packages > 0 ? 'green' : 'red']().bold(number_of_packages)} Package${number_of_packages !== 1 ? 's' : ''}`)}${number_of_packages > 0 && seconds_since_last_package >= 5 ? kleur.red().bold(` (last ${seconds_since_last_package > 59 ? dayjs(time_of_last_package).fromNow() : `${seconds_since_last_package}s ago`})`) : ''}\n\n`);
        }
    }

    const note = (message) => {
        if(!flags.q && !flags.quiet) {
            is_blocking_status = true;
            logUpdate.clear();

            if(is_first_note) {
                is_first_note = false;
            } else if(type_of_last_message !== 'note') {
                console.log();
            }

            log(message);

            is_blocking_status = false;
            type_of_last_message = 'note';
            status();
        }
    }

    const warning = (message) => {
        if(!flags.q && !flags.quiet) {
            is_blocking_status = true;
            logUpdate.clear();

            if(is_first_note) {
                console.log();
                is_first_note = false;
            } else if(type_of_last_message !== 'warning') {
                console.log();
            }

            console.log(kleur.yellow(` ${kleur.bold('Warning:')} ${message}`));

            is_blocking_status = false;
            type_of_last_message = 'warning';
            status();
        }
    }

    await new Promise((resolve) => {
        server.listen(response.port, response.host, () => resolve());
    });

    log(`Initializing server on ${kleur.bold().cyan(response.host)}:${kleur.bold().cyan(response.port)}: ${kleur.bold().green('SUCCESS')}`)

    const serial = await new Promise((resolve) => {
        const value = new SerialPort({ path: response.serial_path, baudRate: response.baud_rate }, (error) => {
            if(error) {
                if(!flags.q && !flags.quiet) {
                    console.log();
                }

                panic(`Could not connect to serial ${response.serial_path}.`)
            }

            resolve(value);
        })
    });

    log(`Connecting to serial ${kleur.bold().cyan(response.serial_path)}: ${kleur.bold().green('SUCCESS')}`)

    let sockets = {};

    setInterval(status, 1000);
    status();

    server.on("connection", (socket) => {
        const id = `${socket.remoteAddress}:${socket.remotePort}`;
        sockets[id] = socket;

        socket.on("data", data => {
            data = data.toString().trim();

            if(data.length > 0 && data.startsWith("{") && data.endsWith("}")) {
                data.split('}').filter((segment) => segment.trim().length > 0).map((segment) => `${segment}}`).forEach((segment) => {
                    try {
                        const parsed = JSON.parse(segment);

                        serial.write(`${parsed.channel}c${parsed.value}w`, 'utf-8', (error) => {
                            if(error) {
                                panic(`Could not write to serial device\n ${error.message}.`);
                            }
                        });
                    } catch (error) {
                        warning("Received invalid formatted message.");
                    }

                    number_of_packages += 1;
                });

                time_of_last_package = new Date();
            }
        });


        socket.on("close", () => {
            delete sockets[id];

            note(`Socket ${kleur.bold().cyan(socket.remoteAddress)}:${kleur.bold().cyan(socket.remotePort)}: ${kleur.bold().red('DISCONNECTED')} `);
        });

        note(`Socket ${kleur.bold().cyan(socket.remoteAddress)}:${kleur.bold().cyan(socket.remotePort)}: ${kleur.bold().green('CONNECTED')} `);
    });
})();
