# Wineinger NHG Architecture

## Product Boundary

The desktop client manages projects, inputs, workflow choices, visualization,
exported run manifests, and cluster script generation. A local execution
service will own binaries, Python environments, SSH/SGE submission, compute jobs,
output files, and scientific provenance.

## Structure Sources

The desktop client supports local structure files and RCSB PDB identifiers.
RCSB imports retain the PDB identifier, official download URL, detected chains,
detected hetero compounds, and experimental-resolution metadata in the project
manifest. Multiple imported protein components form a proposed interaction
system; unrelated coordinate frames must be aligned or docked before a valid
multi-protein simulation is prepared.

## Interaction Builder

Phase 1 captures intended component roles and method selection in each run
manifest:

- `HADDOCK3` represents protein-protein docking to generate ranked complex
  poses for later GROMACS preparation.
- `US-align` represents structural overlay/comparison and does not imply a
  predicted interaction.
- `Manual` represents placement that must be reviewed before simulation.

The HADDOCK3 adapter exports a protein-protein workflow configuration, an input
staging helper, and an Argon SGE CPU job script. It does not present docking
poses as complete until outputs have been run and imported. US-align execution
remains planned.

The results importer accepts a retrieved HADDOCK3 `outputs/` directory, lists
candidate complex PDB files, associates tabular HADDOCK scores when a matching
score artifact is present, previews a candidate in the structure canvas, and
records a user-selected complex for downstream GROMACS preparation.

The initial GROMACS preparation exporter targets protein-only selected
complexes. It emits the selected PDB, `ions`, minimization, NVT, NPT, and
production MDP files, a CPU SGE preparation job, and the verified GPU
production job. The CPU job performs `pdb2gmx`, box definition, solvation,
neutralization/salt addition, minimization, equilibration, and `grompp` output
of `inputs/production.tpr`.

## Workflow Manifest

The UI exports a versioned JSON document:

```json
{
  "schemaVersion": "0.1",
  "project": { "id": "p_example", "name": "Lead optimization study" },
  "input": {
    "receptor": "target.pdb",
    "ligand": "candidate.sdf",
    "smiles": null
  },
  "workflow": {
    "preset": "docking",
    "steps": [
      { "id": "prepare_ligand", "engine": "RDKit" },
      { "id": "dock", "engine": "Vina" }
    ],
    "settings": { "ph": 7.4, "poses": 9, "mdNanoseconds": 10 }
  },
  "execution": {
    "target": "remote-cluster",
    "cluster": {
      "name": "Argon",
      "scheduler": "sge",
      "sshHost": "argon.hpc.uiowa.edu",
      "queue": "UI-GPU",
      "prerequisiteModule": "stack/legacy",
      "module": "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5",
      "command": "gmx",
      "engineVersion": "2016.3",
      "acceleration": "CUDA",
      "walltime": "24:00:00",
      "cpus": 8,
      "gpus": 1
    },
    "status": "awaiting-prepared-tpr-and-submission"
  }
}
```

For an enabled HADDOCK3 interaction, the manifest also records
`interaction.argonExportReady` and its CPU SGE export profile independently of
the later GROMACS execution profile. After output import it records candidate
count and the selected complex rank, score, artifact path, and intended
GROMACS-preparation next stage.

## Adapter Contract

Each executable simulation integration should expose the same lifecycle:

```text
probe()             -> installed/version/capabilities
validate(manifest)  -> actionable input errors
prepare(run_dir)    -> normalized input files and generated commands
execute(run_dir)    -> progress events and engine output
collect(run_dir)    -> typed results and artifact inventory
summarize(results)  -> UI-ready metrics and plots
```

## Initial Connectors

| Connector | First responsibility | Main artifacts |
| --- | --- | --- |
| RDKit | Ligand sanitize, conformers, format conversion | SDF, descriptors |
| AutoDock Vina | Dock prepared ligand into receptor box | PDBQT poses, scores |
| HADDOCK3 | Execute protein-protein docking on Argon CPUs | ranked complexes, cluster scores |
| GROMACS | Run solvated production MD on the cluster | TPR, trajectories, energies |
| OpenMM | Minimize and refine selected complex | trajectory, energies |
| MDAnalysis | Analyze trajectory and contacts | RMSD/RMSF/contact series |

## Execution Safety

Runs should use isolated project directories, preserve original imports, record
the engine version and command line, and never overwrite a completed run. Any
score displayed in the UI must identify the engine and parameters that produced
it.

## Cluster Boundary

The HADDOCK3 export supplies a `.cfg` workflow, a login-node staging script
that downloads RCSB-selected structures or prompts for local PDB inputs, and a
CPU-only SGE `qsub` script. The desktop bridge stores these files in
`projects/<protein-pair>/` so each interaction system has an explicit local
handoff directory. The GROMACS SGE script is a production-run
launcher, not a parameterization pipeline; it expects `inputs/production.tpr`
to have already been produced by a validated preparation step. The Argon
adapter will eventually handle SSH file staging, `qsub` submission, queue
polling, artifact retrieval, and provenance capture. The official
documentation establishes the login host
`argon.hpc.uiowa.edu`, SGE scheduler, `UI-GPU` shared GPU queue, and
`ngpus=1` request. Live cluster output verified the load chain `stack/legacy`
then `gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5` reports CUDA
support, so it is the default GPU execution profile. The modern `2022.3`
module remains available as a future CPU or separately verified candidate.
