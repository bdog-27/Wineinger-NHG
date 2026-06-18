# Wineinger NHG Simulation Runbook

This guide walks through the exact workflow for running a protein-protein
simulation with Wineinger NHG:

1. Load proteins locally
2. Configure HADDOCK3 docking
3. Push the project to Argon
4. Run HADDOCK3 on Argon
5. Pull the project back and import HADDOCK3 results
6. Export GROMACS preparation
7. Push the GROMACS prep folder to Argon
8. Run GROMACS preparation, production, and analysis on Argon
9. Pull the project back and import analysis

This runbook assumes:

- you are using the Wineinger NHG desktop app on Windows
- your project files live under `C:\Users\User\Documents\wineinger-nhg\projects\`
- your Argon account is available at `YOUR_NAME@argon.hpc.YOUR INSTITUTION.edu`
- you are using SSH port `40` when off campus and `22` on campus or on VPN
- HADDOCK3 is installed in your Argon `haddock_env` if haddock_env is not set up do the following:

python -m venv ~/haddock_env
source ~/haddock_env/bin/activate
python -m pip install --upgrade pip
python -m pip install haddock3

If you are not sure whether haddock3 is installed check with:

which haddock3
haddock3 --version
which haddock3-restraints

## 1. Start Wineinger NHG

1. Launch the desktop app.
2. Create a new project.
3. Give it a project name.
4. In **Workspace sync**, set:
   - **Local project path** to the local project folder
   - **Argon host** to your Argon login, for example `bwineinger@argon.hpc.uiowa.edu`
   - **SSH port** to `40` if off campus, or `22` if on campus/VPN
   - **Argon project path** to the exact path on Argon where this project lives

To get the Argon project path:

1. Log into Argon.
2. `cd` into the project folder on Argon.
3. Run:

```bash
pwd
```

4. Copy that full path.
5. Paste it into **Argon project path** in Wineinger NHG.

## 2. Load the proteins

Use one of these routes:

- import an RCSB PDB by structure ID
- load a local PDB file
- use **Create your own protein** and run LocalColabFold first

If you need sequence-to-structure setup instructions first, use
[localcolabfold-workflow.md](./localcolabfold-workflow.md).

For a standard protein-protein workflow:

1. Go to **Load & view proteins**.
2. Import the first protein structure.
3. Import the second protein structure.
4. In **System components**, inspect the available chains.
5. Check only the chains you want to keep for docking.
6. Click each loaded component to preview it in the structure viewer.

Do not continue until:

- both proteins are present in **System components**
- the correct chains are retained
- the structures look correct in the viewer

## 3. Configure HADDOCK3

1. Open the **HADDOCK3** tab.
2. In **Interaction builder**, choose:
   - **Receptor component**
   - **Partner component**
   - **Receptor chain**
   - **Partner chain**
3. Leave the method as **HADDOCK3**.
4. Choose the docking guidance mode:
   - **Blind docking** if you do not know interface residues yet
   - **Interface residues** if you already know likely contact residues
   - **Experimental restraints** if you have external restraint residue sets

If you choose **Interface residues** or **Experimental restraints**:

1. Fill in **Receptor residues**
2. Fill in **Partner residues**

Examples:

- `45, 49, 52-56`
- `12, 18, 22-25`

When the status line says the chains are staged correctly, continue.

## 4. Export HADDOCK3 files locally

1. In the **HADDOCK3** tab, click **Export Argon docking files**.
2. Wineinger NHG creates a project export folder under your local project path.
3. That folder contains the HADDOCK3 config, stage script, job script, and instructions.

Typical contents include:

- `*-haddock3.cfg`
- `*-stage-haddock-inputs.sh`
- `*-haddock3.sge.job`
- `*-submit-haddock-campaign.sh`
- `ARGON-HADDOCK3-INSTRUCTIONS.txt`

## 5. Push the project to Argon

1. In **Workspace sync**, click **Push project**.
2. Complete password and Duo authentication if prompted.
3. Wait for the sync terminal to finish.

After the push, log into Argon and verify the files are there:

```bash
cd /path/to/your/project
ls
```

You should see the exported project content in that folder.

## 6. Prepare HADDOCK3 on Argon

On Argon:

1. Activate the environment that contains `haddock3`.
2. Change into the exported HADDOCK3 project folder.
3. Run the staging helper:

```bash
bash *-stage-haddock-inputs.sh
```

If the stage script tells you to manually place a receptor or partner file:

1. Put that PDB into the `inputs/` folder using the exact filename it requests.
2. Re-run:

```bash
bash *-stage-haddock-inputs.sh
```

When staging is done, verify:

```bash
ls inputs
```

You should see the staged receptor and partner PDB files.

## 7. Submit HADDOCK3 on Argon

If using the known Miniforge environment path:

```bash
qsub -v HADDOCK3_CMD="$HOME/miniforge3/envs/haddock_env/bin/haddock3" *-haddock3.sge.job
```

Then monitor the job:

```bash
qstat -u $USER
```

To watch the log:

```bash
tail -f logs/*.log
```

Wait until the docking run finishes and ranked complexes appear under
`outputs/`.

## 8. Pull the project back and import HADDOCK3 results

1. In Wineinger NHG, click **Pull project** in **Workspace sync**.
2. Wait for the sync to finish.
3. Go to the **HADDOCK3** tab.
4. In **HADDOCK3 results**, click **Import outputs**.
5. Choose the pulled `outputs` folder.
6. Review the ranked complexes.
7. Click **Preview** on candidate poses.
8. When you find the pose you want to simulate, click **Use for MD**.

Do not continue until one HADDOCK3 result is selected for MD.

## 9. Export GROMACS preparation locally

1. Go to **GROMACS & analysis**.
2. Confirm your chosen preparation settings:
   - force field
   - water model
   - box shape
   - padding
   - salt
   - temperature
3. Click **Export GROMACS preparation**.

Wineinger NHG creates a new local prep folder that includes:

- `selected-complex.pdb`
- preparation scripts
- production scripts
- analysis scripts
- `.mdp` files
- Argon instructions

## 10. Push the GROMACS prep folder to Argon

You can use the app sync if the prep folder is under the project path, or copy
manually if needed.

On Argon, change into the GROMACS prep folder and verify it contains:

```bash
ls
```

You should see:

- `selected-complex.pdb`
- `*-gromacs-prep.sge.job`
- `*-gromacs-production.sge.job`
- `*-run-gromacs-analysis.sh`
- `*-gromacs-analysis.sge.job`

## 11. Run GROMACS preparation on Argon

From inside the prep folder:

```bash
bash *-submit-gromacs-prep.sh
```

Monitor the queue:

```bash
qstat -u $USER
```

Watch the preparation log:

```bash
tail -f logs/gromacs-prep.log
```

Wait until preparation finishes and `inputs/production.tpr` exists:

```bash
ls -lh inputs/production.tpr
```

## 12. Run GROMACS production on Argon

From the same prep folder:

```bash
bash *-submit-gromacs-production.sh
```

Monitor:

```bash
qstat -u $USER
tail -f logs/gromacs-production.log
```

Wait until production finishes and `outputs/production.xtc` exists.

## 13. Run GROMACS analysis on Argon

From the same prep folder:

```bash
bash *-submit-gromacs-analysis.sh
```

Monitor:

```bash
qstat -u $USER
tail -f logs/gromacs-analysis.log
```

When it finishes, verify:

```bash
ls analysis
```

You should see `.xvg` files plus summary and visualization helper files.

## 14. Pull the project back and import analysis

1. In Wineinger NHG, click **Pull project**.
2. Wait for the sync to complete.
3. Open **GROMACS & analysis**.
4. Click **Import analysis**.
5. Choose the `analysis` folder.
6. Review:
   - RMSD
   - RMSF
   - radius of gyration
   - periodic image checks
   - interface distance
   - contact count
   - hydrogen bonds

Also read the generated summary:

- `analysis/ANALYSIS-SUMMARY.txt`

## 15. Review the trajectory visually

For a clean protein-only movie, use the generated movie files:

- `analysis/production-protein-only.gro`
- `analysis/production-protein-only.xtc`

Load them into your local viewer, such as VMD, in this order:

1. load `production-protein-only.gro`
2. then load `production-protein-only.xtc`

These are the files meant for inspection because they remove solvent and reduce
periodic-boundary visual artifacts.

## Quick checklist

Use this every run:

1. Create project
2. Set workspace sync paths
3. Load both proteins
4. Keep only the needed chains
5. Configure HADDOCK3 receptor, partner, and chains
6. Choose blind or guided docking
7. Export HADDOCK3 files
8. Push project
9. Stage HADDOCK3 inputs on Argon
10. Submit HADDOCK3
11. Pull project
12. Import HADDOCK3 outputs
13. Select best pose for MD
14. Export GROMACS preparation
15. Push prep folder if needed
16. Submit GROMACS preparation
17. Submit GROMACS production
18. Submit GROMACS analysis
19. Pull project
20. Import analysis
21. Review plots and protein-only movie

## Common stopping points

Stop and fix things before going forward if:

- the wrong chains are still retained
- the HADDOCK3 stage script asks for a missing file
- HADDOCK3 outputs look duplicated or clearly artificial
- no GROMACS `production.tpr` was generated
- trajectory playback shows obvious periodic-boundary artifacts and you are not
  using the protein-only movie files

