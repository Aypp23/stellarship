fn main() {
    // Use Docker builds by default so developers don't need a local RISC0 toolchain installed.
    // The docker build root must include sibling crates (e.g. `../shared`).
    use std::collections::HashMap;

    use risc0_build::{DockerOptionsBuilder, GuestOptionsBuilder};

    let docker_opts = DockerOptionsBuilder::default()
        .root_dir("..")
        .build()
        .expect("DockerOptionsBuilder failed");

    let guest_opts = GuestOptionsBuilder::default()
        .use_docker(docker_opts)
        .build()
        .expect("GuestOptionsBuilder failed");

    let mut opts = HashMap::new();
    // Guest package name (Cargo.toml `package.name`)
    opts.insert("zkbs-settle", guest_opts);

    risc0_build::embed_methods_with_options(opts);
}
