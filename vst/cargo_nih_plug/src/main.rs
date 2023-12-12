fn main() -> nih_plug_xtask::Result<()> {
    // This includes both the `cargo` command and the `afterglow` subcommand, so we should get rid of
    // those first
    let args = std::env::args().skip(2);
    nih_plug_xtask::main_with_args("cargo afterglow", args)
}
