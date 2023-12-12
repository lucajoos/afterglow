use nih_plug::prelude::*;
use std::fmt::Debug;
use std::io::Write;
use std::net::TcpStream;
use std::sync::Arc;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct PreviousParams {
    channel: i32,
    value: i32
}

struct Afterglow {
    params: Arc<AfterglowParams>,
    previous_params: PreviousParams,
    stream: Option<TcpStream>,
    address: String
}

#[derive(Params)]
struct AfterglowParams {
    #[id = "Channel"]
    channel: IntParam,
    #[id = "Value"]
    value: IntParam,
}

impl Default for Afterglow {
    fn default() -> Self {
        let address = "127.0.0.1:34254".to_string();
        let params = AfterglowParams::default();
        let previous_params = PreviousParams::default();

        Self {
            stream: None,
            params: Arc::new(params),
            previous_params,
            address
        }
    }
}

impl Default for PreviousParams {
    fn default() -> Self {
        Self {
            channel: 0,
            value: 0
        }
    }
}

impl Default for AfterglowParams {
    fn default() -> Self {
        Self {
            channel: IntParam::new("Channel", 0, IntRange::Linear { min: 1, max: 512 }),
            value: IntParam::new("Value", 0, IntRange::Linear { min: 0, max: 255 })
        }
    }
}

impl Plugin for Afterglow {
    const NAME: &'static str = "Afterglow";
    const VENDOR: &'static str = "Luca Raúl Joos";
    const URL: &'static str = "https://lucajoos.de";
    const EMAIL: &'static str = "me@lucajoos.de";

    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[
        AudioIOLayout {
            main_input_channels: None,
            main_output_channels: NonZeroU32::new(2),
            ..AudioIOLayout::const_default()
        },
        AudioIOLayout {
            main_input_channels: None,
            main_output_channels: NonZeroU32::new(1),
            ..AudioIOLayout::const_default()
        },
    ];

    const MIDI_INPUT: MidiConfig = MidiConfig::Basic;
    const SAMPLE_ACCURATE_AUTOMATION: bool = true;

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        _buffer_config: &BufferConfig,
        _context: &mut impl InitContext<Self>,
    ) -> bool {
        if self.stream.is_none() {
            let stream = TcpStream::connect(&self.address);

            if stream.is_ok() {
                self.stream = Some(stream.unwrap());
            };
        }

        true
    }

    fn reset(&mut self) {
    }

    fn process(
        &mut self,
        _buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        let channel = self.params.channel.value();
        let value = self.params.value.value();

        if channel <= 512 && value < 256 {
            let mut has_changed = false;

            if self.previous_params.channel != channel {
                self.previous_params.channel = channel;
                has_changed = true;
            }

            if self.previous_params.value != value {
                self.previous_params.value = value;
                has_changed = true;
            }

            if has_changed {
                let mut is_ok = true;

                if self.stream.is_some() {
                    let mut stream = self.stream.as_ref().unwrap();

                    let was_successful = stream
                        .write(
                            serde_json::to_string(&self.previous_params).unwrap().as_bytes()
                        ).is_ok();

                    if !was_successful {
                        is_ok = false;
                    }
                } else {
                    is_ok = false;
                }

                if !is_ok {
                    self.stream = None;

                    let stream = TcpStream::connect(&self.address);

                    if stream.is_ok() {
                        self.stream = Some(stream.unwrap());
                    };
                }
            }
        }

        ProcessStatus::KeepAlive
    }
}

impl Vst3Plugin for Afterglow {
    const VST3_CLASS_ID: [u8; 16] = *b"_AfterglowPlugin";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Instrument,
        Vst3SubCategory::Synth,
        Vst3SubCategory::Tools,
    ];
}

nih_export_vst3!(Afterglow);
