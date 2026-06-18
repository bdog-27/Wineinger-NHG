# LocalColabFold Workflow

This guide shows how to:

1. Install LocalColabFold on a local GPU workstation
2. Run it directly from the shell
3. Use it together with Wineinger NHG

This guide is written for the current Wineinger NHG workflow on Windows with
WSL2, because that is the cleanest path for a local NVIDIA GPU machine.

## What LocalColabFold is for

Use LocalColabFold when you want to:

- generate a structure from an amino acid sequence
- generate a multimer prediction from chained sequences such as `SEQ_A:SEQ_B`
- create extra structural evidence before a HADDOCK3 docking campaign

Do not treat LocalColabFold as a replacement for experimental structures when
good PDB structures already exist. In Wineinger NHG, the normal priority is:

1. experimental PDB structure if available
2. LocalColabFold prediction if you only have sequence
3. imported external prediction if you already ran AlphaFold or AlphaFold 3 elsewhere

## Recommended install target

Install LocalColabFold inside WSL2 at:

```bash
~/tools/localcolabfold
```

Wineinger NHG currently expects that location when you click
**Open LocalColabFold**.

## Prerequisites

Before installing LocalColabFold:

1. Install WSL2 on Windows
2. Use a recent Ubuntu release inside WSL2
3. Make sure `git`, `curl`, and `wget` are available
4. Make sure your NVIDIA CUDA toolchain is new enough for the current LocalColabFold release

Check the CUDA compiler version inside WSL:

```bash
nvcc --version
```

The LocalColabFold repository currently says CUDA 12.1 or later is required,
with CUDA 12.4 recommended.

## Install LocalColabFold in WSL2

In WSL:

```bash
sudo apt -y install curl git wget
cd ~
mkdir -p tools
cd tools
git clone https://github.com/YoshitakaMo/localcolabfold.git
cd localcolabfold
curl -fsSL https://pixi.sh/install.sh | sh
pixi install
pixi run setup
```

After install, the executable usually lives at:

```bash
~/tools/localcolabfold/.pixi/envs/default/bin/colabfold_batch
```

Check it with:

```bash
~/tools/localcolabfold/.pixi/envs/default/bin/colabfold_batch --help
```

If the command prints the help text, the install is working.

## WSL case-sensitivity note

If installation fails with symlink or path-case errors, enable Windows
case-sensitive behavior on the installation folder from Windows PowerShell, not
from WSL:

```powershell
fsutil file SetCaseSensitiveInfo C:\Users\User\tools\localcolabfold enable
```

Use your real Windows path if it differs.

## Memory settings for WSL runs

Before running predictions in WSL, the LocalColabFold README suggests these
environment variables:

```bash
export TF_FORCE_UNIFIED_MEMORY="1"
export XLA_PYTHON_CLIENT_MEM_FRACTION="4.0"
export XLA_PYTHON_CLIENT_ALLOCATOR="platform"
export TF_FORCE_GPU_ALLOW_GROWTH="true"
```

If you want them every time, add them to your shell startup file such as
`~/.bashrc`.

## How to run LocalColabFold directly

### Monomer prediction

Create a FASTA file:

```text
>my_protein
MSEQNNTEMTFQIQRIYTKDISFEAPNAPHVFQ...
```

Run:

```bash
~/tools/localcolabfold/.pixi/envs/default/bin/colabfold_batch my_protein.fasta output --num-recycle 3
```

### Complex prediction

Use `:` between chain sequences:

```text
>my_complex
SEQUENCEFORPARTNERA:SEQUENCEFORPARTNERB
```

Run:

```bash
~/tools/localcolabfold/.pixi/envs/default/bin/colabfold_batch my_complex.fasta output --num-recycle 3
```

### Useful flags

- `--num-recycle 3` is a good default starting point
- `--amber` adds relaxation
- `--use-gpu-relax` uses the GPU for relaxation
- `--num-seeds` tries multiple seeds
- `--random-seed` changes the starting seed

For the full flag list:

```bash
~/tools/localcolabfold/.pixi/envs/default/bin/colabfold_batch --help
```

## How to use LocalColabFold with Wineinger NHG

Wineinger NHG uses LocalColabFold in two main ways.

### A. Create your own protein from sequence

Use this when you do not already have a structure.

1. Open **Load & view proteins**
2. In **Create your own protein**, enter:
   - a protein name
   - the amino acid sequence
3. Click **Export sequence files**
4. Wineinger NHG writes a LocalColabFold bundle containing:
   - a FASTA file
   - `run-colabfold.cmd`
   - `run-colabfold.sh`
   - a short README
5. Click **Open LocalColabFold** if your WSL install is in `~/tools/localcolabfold`
6. Run the provided command in the WSL shell if needed
7. When the prediction finishes, import the resulting folder back into Wineinger NHG
8. Use the predicted PDB model as a structure component

### B. Generate extra evidence for a protein-protein pair

Use this when you already have two structures loaded and want an additional
sequence-based complex prediction before choosing guided HADDOCK3 restraints.

1. Load both proteins in Wineinger NHG
2. Retain the correct chains in **System components**
3. In the ColabFold export area, click **Export ColabFold files**
4. Wineinger NHG creates:
   - `<project>-colabfold.fasta`
   - `LOCAL-COLABFOLD-SEQUENCES.txt`
   - run scripts
5. Run the FASTA through LocalColabFold on the local GPU workstation
6. Import the LocalColabFold output folder into Wineinger NHG
7. Review the predicted models and inferred interface residues
8. Use that information to guide the HADDOCK3 5-2-1 campaign if it looks biologically plausible

## Practical tandem workflow

For a sequence-first discovery workflow:

1. generate or collect the amino acid sequences
2. run LocalColabFold locally to obtain candidate structures
3. import the resulting PDB models into Wineinger NHG
4. select the chains you want to keep
5. run HADDOCK3 on Argon to sample docking poses
6. choose the best HADDOCK3 pose
7. run GROMACS preparation, production, and analysis

For a structure-first workflow:

1. import experimental PDB structures directly
2. optionally run LocalColabFold as extra evidence
3. run HADDOCK3 on Argon
4. continue into GROMACS

## What to expect in the output

Typical useful outputs include:

- ranked PDB models
- confidence plots
- PAE outputs
- JSON sidecar files

Wineinger NHG mainly cares about the predicted PDB models when importing the
results, but the confidence outputs are still worth keeping for manual review.

## Common issues

### Out-of-memory errors

If you see `RESOURCE_EXHAUSTED`:

- reduce the total sequence length
- use fewer seeds
- keep recycles low at first
- avoid running multiple GPU-heavy jobs at once

A local ColabFold run can still fail even when the sequences are biologically
reasonable if the GPU memory budget is too tight.

### Nothing opens when you click Open LocalColabFold

Check that the repository is installed at:

```bash
~/tools/localcolabfold
```

Wineinger NHG currently tries to open that folder in WSL.

### The shell opens but the command is missing

Run:

```bash
cd ~/tools/localcolabfold
./.pixi/envs/default/bin/colabfold_batch --help
```

If that works, the install is present and the issue is just PATH or launch
convenience.

## When to trust it and when not to

LocalColabFold is useful for generating candidate structures and interface
ideas. It is not a final proof of binding by itself.

Inside Wineinger NHG, the safest interpretation is:

- LocalColabFold suggests plausible folds or interfaces
- HADDOCK3 tests docking poses
- GROMACS tests whether the selected pose remains stable enough to keep studying

## Sources

- [YoshitakaMo/localcolabfold](https://github.com/YoshitakaMo/localcolabfold)
- [pixi installation](https://pixi.prefix.dev/latest/#installation)
