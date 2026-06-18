# Wineinger NHG

Wineinger NHG is a desktop molecular discovery workbench intended to combine
structure preparation, docking, molecular dynamics, and analysis tools behind
one project workflow.

## Desktop App

Wineinger NHG now has a local Electron desktop shell. On Windows, launch it by
double-clicking:

- [start-wineinger-nhg.cmd](./start-wineinger-nhg.cmd) for an empty workspace.
- [start-wineinger-nhg-demo.cmd](./start-wineinger-nhg-demo.cmd) for the populated GROMACS
  and Argon example.

The app stores project data under the ignored `workspace-data/` directory.

## Workflow Guides

- [Simulation runbook](./docs/simulation-runbook.md)
- [LocalColabFold workflow](./docs/localcolabfold-workflow.md)

## Current Build

The current desktop build provides:

- Local project workspaces.
- `PDB` receptor and `SDF`/`MOL` ligand import.
- RCSB PDB ID import with provenance, chain, ligand, and resolution metadata.
- Multiple protein components for planned interaction systems.
- Interaction Builder with receptor/partner roles, HADDOCK3 docking export, or
  planned US-align overlay methods.
- A rotatable structure canvas for imported coordinates.
- Docking, GROMACS refinement, and GROMACS protein stability workflow presets.
- Run-plan generation and JSON manifest export.
- Argon/SGE export for CPU-based HADDOCK3 docking and GPU-capable GROMACS MD.
- HADDOCK3 result-folder import, ranked complex preview, and candidate
  selection for downstream GROMACS preparation.
- GROMACS preparation bundle export with Argon SGE helper scripts, MDP files,
  folder organization, CPU preparation, GPU production, and post-run analysis
  jobs.
- Local GROMACS analysis import with plots for RMSD, RMSF, radius of gyration,
  periodic-image checks, interface distance, interface contacts, and hydrogen
  bonds.
- Automated interpretation notes that prefer cleaned/PBC-processed plots when
  available and flag stable candidates, likely imaging artifacts, and possible
  dissociation.

This build exports local project bundles and Argon SGE scripts, but it still
keeps cluster execution manual: copy bundles with `scp`, submit jobs on Argon,
then copy `outputs/` and `analysis/` folders back into Wineinger NHG.

## Use It

Launch the desktop demo with [start-wineinger-nhg-demo.cmd](./start-wineinger-nhg-demo.cmd)
to populate a small receptor/ligand example, adjust a workflow, and export a
manifest. With two protein components selected in **Interaction builder**,
choose HADDOCK3 and export an Argon docking package. It includes the HADDOCK3
configuration, input-staging helper, and CPU-only SGE job, stored in
`projects/<protein-pair>/` inside the Wineinger NHG folder. For a GROMACS
preset, configure **Cluster execution** and export the GPU-capable SGE job
script; it intentionally requires `inputs/production.tpr`, because a
trustworthy ligand/topology preparation pipeline must be connected first.

After a HADDOCK3 job finishes on Argon, copy its `outputs/` directory back into
the project folder and use **Import outputs** in the desktop app. Select a ranked
complex with **Use for MD** to preserve it as the candidate for the next GROMACS
preparation stage. Configure the solvation settings and select **Export GROMACS
preparation** to create a bundle containing the selected PDB, MDP inputs, a CPU
preparation job, a GPU production job, post-run analysis scripts, and Argon
instructions.

After GROMACS production and analysis finish on Argon, copy the `analysis/`
folder back into the local project folder and select **Import analysis**. Wineinger NHG
will plot recognized `.xvg` files, including cleaned names such as
`complex-backbone-rmsd-cluster-fit.xvg`, and produce a cautious stability
interpretation. Treat these outputs as screening support rather than proof of
biological binding.


