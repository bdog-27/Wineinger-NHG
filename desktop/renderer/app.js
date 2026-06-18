(function () {
  "use strict";

  var STORAGE_KEY = "wineinger-nhg-workspace-v1";
  var LEGACY_STORAGE_KEY = "ez-sims-workspace-v1";
  var DISCOVERY_BLIND_JOBS = 5;
  var DISCOVERY_GUIDED_JOBS = 2;
  var DISCOVERY_GROMACS_JOBS = 1;
  var engines = [
    { id: "rdkit", label: "RDKit", state: "Planned" },
    { id: "vina", label: "AutoDock Vina", state: "Planned" },
    { id: "gromacs", label: "GROMACS", state: "GPU verified" },
    { id: "haddock3", label: "HADDOCK3", state: "Argon planned" },
    { id: "openmm", label: "OpenMM", state: "Planned" },
    { id: "mdanalysis", label: "MDAnalysis", state: "Planned" }
  ];
  var workflowDefinitions = {
    docking: [
      { id: "prepare_receptor", label: "Prepare receptor", engine: "RDKit", detail: "Protonation and cleanup", enabled: true },
      { id: "prepare_ligand", label: "Prepare ligand", engine: "RDKit", detail: "Conformer generation", enabled: true },
      { id: "dock", label: "Dock candidates", engine: "Vina", detail: "Rank binding poses", enabled: true },
      { id: "interactions", label: "Analyze contacts", engine: "MDAnalysis", detail: "Pose summary", enabled: true }
    ],
    refinement: [
      { id: "prepare_receptor", label: "Prepare receptor", engine: "RDKit", detail: "Protonation and cleanup", enabled: true },
      { id: "prepare_ligand", label: "Prepare ligand", engine: "RDKit", detail: "Conformer generation", enabled: true },
      { id: "dock", label: "Dock candidates", engine: "Vina", detail: "Rank binding poses", enabled: true },
      { id: "interaction_build", label: "Build interaction complex", engine: "HADDOCK3", detail: "Protein docking or alignment", enabled: true },
      { id: "solvate", label: "Build solvated complex", engine: "GROMACS", detail: "Topology, water and ions", enabled: true },
      { id: "md", label: "GROMACS MD", engine: "GROMACS", detail: "Equilibrate and simulate", enabled: true },
      { id: "movie_cleanup", label: "Clean movie trajectory", engine: "GROMACS", detail: "Whole, nojump, center and fit", enabled: true },
      { id: "interactions", label: "Analyze trajectory", engine: "MDAnalysis", detail: "Stability and contacts", enabled: true }
    ],
    stability: [
      { id: "prepare_receptor", label: "Prepare receptor", engine: "GROMACS", detail: "Repair and parameterize", enabled: true },
      { id: "solvate", label: "Solvate system", engine: "GROMACS", detail: "Topology, water and ions", enabled: true },
      { id: "md", label: "GROMACS production MD", engine: "GROMACS", detail: "Protein stability", enabled: true },
      { id: "movie_cleanup", label: "Clean movie trajectory", engine: "GROMACS", detail: "Whole, nojump, center and fit", enabled: true },
      { id: "trajectory", label: "Analyze trajectory", engine: "MDAnalysis", detail: "RMSD and RMSF", enabled: true }
    ]
  };
  var renderState = {
    rotationX: -0.3,
    rotationY: 0.5,
    receptorVisible: true,
    ligandVisible: true,
    dragging: false,
    pointerX: 0,
    pointerY: 0
  };

  var refs = {
    projectList: document.getElementById("project-list"),
    projectName: document.getElementById("project-name"),
    projectStatus: document.getElementById("project-status"),
    workspaceLocalPath: document.getElementById("workspace-local-path"),
    workspaceArgonHost: document.getElementById("workspace-argon-host"),
    workspaceArgonPort: document.getElementById("workspace-argon-port"),
    workspaceArgonPath: document.getElementById("workspace-argon-path"),
    syncStatus: document.getElementById("sync-status"),
    syncOutput: document.getElementById("sync-output"),
    syncPush: document.getElementById("sync-push-button"),
    syncPull: document.getElementById("sync-pull-button"),
    dashboard: document.getElementById("dashboard"),
    workflowTabs: Array.from(document.querySelectorAll(".workflow-tabs button")),
    workflowPanels: Array.from(document.querySelectorAll("[data-step]")),
    engineList: document.getElementById("engine-list"),
    newProject: document.getElementById("new-project-button"),
    loadDemo: document.getElementById("load-demo-button"),
    exportButton: document.getElementById("export-button"),
    exportScriptButton: document.getElementById("export-script-button"),
    createRun: document.getElementById("create-run-button"),
    receptorFile: document.getElementById("receptor-file"),
    customProteinName: document.getElementById("custom-protein-name"),
    customProteinSequence: document.getElementById("custom-protein-sequence"),
    openCustomColabfoldButton: document.getElementById("open-custom-colabfold-button"),
    exportCustomColabfoldButton: document.getElementById("export-custom-colabfold-button"),
    customColabfoldDirectory: document.getElementById("custom-colabfold-directory"),
    customProteinStatus: document.getElementById("custom-protein-status"),
    ligandFile: document.getElementById("ligand-file"),
    removeLigand: document.getElementById("remove-ligand-button"),
    receptorLabel: document.getElementById("receptor-label"),
    ligandLabel: document.getElementById("ligand-label"),
    smiles: document.getElementById("smiles-input"),
    metrics: document.getElementById("asset-metrics"),
    pdbId: document.getElementById("pdb-id-input"),
    fetchPdb: document.getElementById("fetch-pdb-button"),
    pdbStatus: document.getElementById("pdb-import-status"),
    componentCount: document.getElementById("component-count"),
    componentList: document.getElementById("component-list"),
    canvas: document.getElementById("structure-canvas"),
    emptyView: document.getElementById("empty-view"),
    viewerNote: document.getElementById("viewer-note"),
    viewerHoverReadout: document.getElementById("viewer-hover-readout"),
    dockCanvas: document.getElementById("dock-structure-canvas"),
    dockEmptyView: document.getElementById("dock-empty-view"),
    dockHoverReadout: document.getElementById("dock-hover-readout"),
    dockViewerReset: document.getElementById("dock-viewer-reset"),
    toggleReceptor: document.getElementById("toggle-receptor"),
    toggleLigand: document.getElementById("toggle-ligand"),
    viewerStyle: document.getElementById("viewer-style"),
    viewerColor: document.getElementById("viewer-color"),
    viewerQuality: document.getElementById("viewer-quality"),
    viewerShowHetero: document.getElementById("viewer-show-hetero"),
    viewerReset: document.getElementById("viewer-reset"),
    interactionBody: document.getElementById("interaction-body"),
    interactionReceptor: document.getElementById("interaction-receptor"),
    interactionPartner: document.getElementById("interaction-partner"),
    interactionReceptorChain: document.getElementById("interaction-receptor-chain"),
    interactionPartnerChain: document.getElementById("interaction-partner-chain"),
    interactionMethods: Array.from(document.querySelectorAll(".method-choice")),
    interactionGuidance: document.getElementById("interaction-guidance"),
    restraintGrid: document.getElementById("restraint-grid"),
    receptorRestraints: document.getElementById("receptor-restraints"),
    partnerRestraints: document.getElementById("partner-restraints"),
    interactionStatus: document.getElementById("interaction-status"),
    exportHaddockButton: document.getElementById("export-haddock-button"),
    preset: document.getElementById("preset-select"),
    workflowSteps: document.getElementById("workflow-steps"),
    ph: document.getElementById("ph-input"),
    poses: document.getElementById("poses-input"),
    md: document.getElementById("md-input"),
    clusterEnabled: document.getElementById("cluster-enabled"),
    clusterFields: document.getElementById("cluster-fields"),
    clusterHost: document.getElementById("cluster-host"),
    clusterPort: document.getElementById("cluster-port"),
    clusterQueue: document.getElementById("cluster-queue"),
    clusterPrerequisite: document.getElementById("cluster-prerequisite"),
    clusterModule: document.getElementById("cluster-module"),
    clusterCommand: document.getElementById("cluster-command"),
    clusterGpuSupport: document.getElementById("cluster-gpu-support"),
    clusterTime: document.getElementById("cluster-time"),
    clusterCpus: document.getElementById("cluster-cpus"),
    clusterGpu: document.getElementById("cluster-gpu"),
    executionNote: document.getElementById("execution-note"),
    resultsDirectory: document.getElementById("results-directory"),
    resultStatus: document.getElementById("result-status"),
    haddockInterpretation: document.getElementById("haddock-interpretation"),
    inferInterfaceButton: document.getElementById("infer-interface-button"),
    resultList: document.getElementById("result-list"),
    openColabfoldButton: document.getElementById("open-colabfold-button"),
    exportColabfoldButton: document.getElementById("export-colabfold-button"),
    colabfoldDirectory: document.getElementById("colabfold-directory"),
    colabfoldStatus: document.getElementById("colabfold-status"),
    colabfoldReceptorResidues: document.getElementById("colabfold-receptor-residues"),
    colabfoldPartnerResidues: document.getElementById("colabfold-partner-residues"),
    colabfoldModelList: document.getElementById("colabfold-model-list"),
    gromacsPreparation: document.getElementById("gromacs-preparation"),
    prepForceField: document.getElementById("prep-force-field"),
    prepWaterModel: document.getElementById("prep-water-model"),
    prepBoxShape: document.getElementById("prep-box-shape"),
    prepPadding: document.getElementById("prep-padding"),
    prepSalt: document.getElementById("prep-salt"),
    prepTemperature: document.getElementById("prep-temperature"),
    exportGromacsPrepButton: document.getElementById("export-gromacs-prep-button"),
    gromacsPrepStatus: document.getElementById("gromacs-prep-status"),
    analysisDirectory: document.getElementById("analysis-directory"),
    analysisStatus: document.getElementById("analysis-status"),
    analysisFileGuide: document.getElementById("analysis-file-guide"),
    analysisInterpretation: document.getElementById("analysis-interpretation"),
    analysisMetrics: document.getElementById("analysis-metrics"),
    analysisTabs: document.getElementById("analysis-tabs"),
    analysisChartTitle: document.getElementById("analysis-chart-title"),
    analysisChartDetail: document.getElementById("analysis-chart-detail"),
    analysisPointCount: document.getElementById("analysis-point-count"),
    analysisCanvas: document.getElementById("analysis-chart-canvas"),
    analysisSummary: document.getElementById("analysis-summary-text"),
    runCount: document.getElementById("run-count"),
    runList: document.getElementById("run-list")
  };
  var resultFileCache = {};
  var colabfoldModelCache = {};
  var pdbTextFetches = {};
  var pdbTextFetchFailures = {};
  var state = loadState();
  var activeWorkflowStep = "proteins";
  var structureViewer = {
    stage: null,
    signature: "",
    loadId: 0,
    hoverInstalled: false
  };
  var dockViewer = {
    stage: null,
    signature: "",
    loadId: 0,
    hoverInstalled: false
  };
  var viewerSettings = {
    style: "cartoon",
    color: "chain",
    quality: "medium",
    showHetero: true
  };

  function uid() {
    return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function slugText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function defaultWorkspaceProfile(name) {
    var slug = slugText(name) || "new-discovery-study";
    return {
      localPath: "C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + slug,
      remotePath: "~/wineinger-nhg/PROJECTS/" + slug,
      host: "bwineinger@argon.hpc.uiowa.edu",
      port: 40,
      method: "rsync"
    };
  }

  function newProject(name) {
    return {
      id: uid(),
      name: name || "Untitled study",
      status: "Draft",
      modified: new Date().toISOString(),
      assets: { receptor: null, ligand: null, smiles: "" },
      system: { components: [] },
      interaction: defaultInteraction(),
      workspace: defaultWorkspaceProfile(name || "Untitled study"),
      proteinBuilder: defaultProteinBuilder(),
      workflow: {
        preset: "docking",
        steps: cloneSteps("docking"),
        settings: { ph: 7.4, poses: 9, mdNanoseconds: 10 }
      },
      execution: defaultExecution(),
      viewer: defaultViewer(),
      results: defaultResults(),
      haddockHistory: defaultHaddockHistory(),
      colabfold: defaultColabfold(),
      analysis: defaultAnalysis(),
      runs: []
    };
  }

  function defaultExecution() {
    return {
      target: "cluster",
      enabled: false,
      scheduler: "sge",
      clusterName: "Argon",
      sshHost: "argon.hpc.uiowa.edu",
      sshPort: 22,
      queue: "UI-GPU",
      prerequisiteModule: "stack/legacy",
      module: "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5",
      command: "gmx",
      engineVersion: "2016.3",
      acceleration: "CUDA",
      walltime: "24:00:00",
      cpus: 8,
      gpu: true,
      gpuSupport: "enabled"
    };
  }

  function defaultInteraction() {
    return {
      enabled: true,
      receptorId: null,
      partnerId: null,
      receptorChain: null,
      partnerChain: null,
      method: "haddock3",
      guidance: "blind",
      receptorRestraints: "",
      partnerRestraints: "",
      status: "configuration-only"
    };
  }

  function defaultViewer() {
    return {
      componentId: null
    };
  }

  function defaultResults() {
    return {
      sourceFolder: null,
      importedAt: null,
      phase: null,
      candidates: [],
      selectedId: null,
      selectedComplex: null,
      preview: null,
      scoreSummary: null,
      interfaceInference: null,
      preparation: defaultGromacsPreparation()
    };
  }

  function defaultHaddockHistory() {
    return {
      blind: null,
      guided: null
    };
  }

  function defaultColabfold() {
    return {
      importedAt: null,
      modelCount: 0,
      modelsWithContacts: 0,
      receptorResidues: "",
      partnerResidues: "",
      models: [],
      selectedModelId: null,
      preview: null
    };
  }

  function defaultProteinBuilder() {
    return {
      name: "",
      sequence: "",
      importedAt: null,
      sourceFolder: null
    };
  }

  function defaultAnalysis() {
    return {
      importedAt: null,
      sourceFolder: null,
      summary: "",
      centeredTrajectory: false,
      movieTrajectory: "",
      trajectoryFiles: [],
      plots: [],
      selectedPlotId: null
    };
  }

  function defaultGromacsPreparation() {
    return {
      forceField: "amber99sb-ildn",
      waterModel: "tip3p",
      boxShape: "dodecahedron",
      paddingNanometers: 1.2,
      saltMolar: 0.15,
      temperatureKelvin: 300,
      status: "not-exported"
    };
  }

  function cloneSteps(preset) {
    return workflowDefinitions[preset].map(function (step) {
      return Object.assign({}, step);
    });
  }

  function loadState() {
    var stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      try {
        var parsed = JSON.parse(stored);
        if (parsed.projects && parsed.projects.length) {
          parsed.projects.forEach(normalizeProject);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    var first = newProject("Lead optimization study");
    return { projects: [first], currentProjectId: first.id };
  }

  function normalizeProject(project) {
    if (project.execution && project.execution.scheduler === "slurm") {
      project.execution = {
        enabled: project.execution.enabled,
        module: project.execution.module,
        walltime: project.execution.walltime,
        cpus: project.execution.cpus,
        gpu: project.execution.gpu
      };
    }
    project.execution = Object.assign(defaultExecution(), project.execution || {});
    if (project.execution.module === "gromacs") {
      project.execution.module = "gromacs/2016.3_openmpi-2.0.1_parallel_studio-2017.1";
      project.execution.gpu = false;
      project.execution.gpuSupport = "disabled";
    }
    if (project.execution.module === "gromacs/2022.3_gcc-9.5.0" && project.execution.gpuSupport === "unknown") {
      project.execution.prerequisiteModule = "stack/legacy";
      project.execution.module = "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5";
      project.execution.queue = "UI-GPU";
      project.execution.gpu = true;
      project.execution.gpuSupport = "enabled";
    }
    if (project.execution.gpuSupport === "disabled" && project.execution.queue === "UI-GPU") {
      project.execution.queue = "";
    }
    project.runs = project.runs || [];
    project.assets = project.assets || { receptor: null, ligand: null, smiles: "" };
    project.system = project.system || { components: [] };
    project.system.components.forEach(normalizeComponentChains);
    project.proteinBuilder = Object.assign(defaultProteinBuilder(), project.proteinBuilder || {});
    project.interaction = Object.assign(defaultInteraction(), project.interaction || {});
    project.interaction.enabled = true;
    project.workspace = Object.assign(defaultWorkspaceProfile(project.name), project.workspace || {});
    project.viewer = Object.assign(defaultViewer(), project.viewer || {});
    project.results = Object.assign(defaultResults(), project.results || {});
    project.results.preparation = Object.assign(defaultGromacsPreparation(), project.results.preparation || {});
    project.haddockHistory = Object.assign(defaultHaddockHistory(), project.haddockHistory || {});
    project.colabfold = Object.assign(defaultColabfold(), project.colabfold || {});
    project.analysis = Object.assign(defaultAnalysis(), project.analysis || {});
    if (project.workflow && project.workflow.preset === "refinement" && !project.workflow.steps.some(function (step) {
      return step.id === "interaction_build";
    })) {
      var solvateIndex = project.workflow.steps.findIndex(function (step) {
        return step.id === "solvate";
      });
      var interactionStep = { id: "interaction_build", label: "Build interaction complex", engine: "HADDOCK3", detail: "Protein docking or alignment", enabled: true };
      if (solvateIndex === -1) {
        project.workflow.steps.push(interactionStep);
      } else {
        project.workflow.steps.splice(solvateIndex, 0, interactionStep);
      }
    }
    if (project.workflow && project.workflow.preset === "refinement") {
      project.workflow.steps.forEach(function (step) {
        if (step.id === "interaction_build") {
          step.enabled = true;
        }
      });
    }
    if (project.workflow && /^(refinement|stability)$/.test(project.workflow.preset) && !project.workflow.steps.some(function (step) {
      return step.id === "movie_cleanup";
    })) {
      var analysisIndex = project.workflow.steps.findIndex(function (step) {
        return step.id === "interactions" || step.id === "trajectory";
      });
      var movieStep = { id: "movie_cleanup", label: "Clean movie trajectory", engine: "GROMACS", detail: "Whole, nojump, center and fit", enabled: true };
      if (analysisIndex === -1) {
        project.workflow.steps.push(movieStep);
      } else {
        project.workflow.steps.splice(analysisIndex, 0, movieStep);
      }
    }
    if (!project.system.components.length && project.assets.receptor) {
      project.system.components.push({
        id: uid(),
        label: project.assets.receptor.name,
        source: "local",
        sourceId: null,
        atoms: project.assets.receptor.atoms,
        metadata: { chains: [], ligands: [], resolution: null },
        visible: true
      });
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentProject() {
    return state.projects.find(function (project) {
      return project.id === state.currentProjectId;
    });
  }

  function projectById(projectId) {
    return state.projects.find(function (project) {
      return project.id === projectId;
    });
  }

  function touchProject() {
    currentProject().modified = new Date().toISOString();
    saveState();
    renderProjects();
  }

  function shortDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderEngines() {
    refs.engineList.innerHTML = "";
    engines.forEach(function (engine) {
      var row = document.createElement("div");
      row.className = "engine-row";
      row.innerHTML = "<span>" + engine.label + "</span><span class=\"connector-state\">" + engine.state + "</span>";
      refs.engineList.appendChild(row);
    });
  }

  function renderProjects() {
    refs.projectList.innerHTML = "";
    state.projects.forEach(function (project) {
      var row = document.getElementById("project-template").content.firstElementChild.cloneNode(true);
      var openButton = row.querySelector(".project-open");
      row.classList.toggle("active", project.id === state.currentProjectId);
      row.querySelector("strong").textContent = project.name;
      row.querySelector("small").textContent = shortDate(project.modified) + " - " + project.runs.length + " plans";
      openButton.addEventListener("click", function () {
        state.currentProjectId = project.id;
        saveState();
        render();
      });
      row.querySelector(".rename").addEventListener("click", function () {
        renameProject(project.id);
      });
      row.querySelector(".delete").addEventListener("click", function () {
        deleteProject(project.id);
      });
      refs.projectList.appendChild(row);
    });
  }

  function renameProject(projectId) {
    var project = projectById(projectId);
    if (!project) {
      return;
    }
    var nextName = window.prompt("Rename project", project.name);
    if (nextName === null) {
      return;
    }
    nextName = nextName.trim();
    if (!nextName) {
      return;
    }
    project.name = nextName.slice(0, 52);
    project.modified = new Date().toISOString();
    saveState();
    render();
  }

  function deleteProject(projectId) {
    var project = projectById(projectId);
    if (!project) {
      return;
    }
    var message = "Delete \"" + project.name + "\"? This removes it from Wineinger NHG on this computer.";
    if (!window.confirm(message)) {
      return;
    }
    state.projects = state.projects.filter(function (item) {
      return item.id !== projectId;
    });
    if (!state.projects.length) {
      var replacement = newProject("New discovery study");
      state.projects.push(replacement);
      state.currentProjectId = replacement.id;
    } else if (state.currentProjectId === projectId) {
      state.currentProjectId = state.projects[0].id;
    }
    saveState();
    render();
  }

  function renderAssets() {
    var project = currentProject();
    var assets = project.assets;
    var proteinBuilder = project.proteinBuilder || defaultProteinBuilder();
    refs.receptorLabel.textContent = assets.receptor ? assets.receptor.name : "PDB";
    refs.ligandLabel.textContent = assets.ligand ? assets.ligand.name : "SDF or MOL";
    refs.removeLigand.disabled = !assets.ligand;
    refs.smiles.value = assets.smiles;
    refs.customProteinName.value = proteinBuilder.name || "";
    refs.customProteinSequence.value = proteinBuilder.sequence || "";
    refs.exportCustomColabfoldButton.disabled = !canExportCustomProtein(project);
    refs.openCustomColabfoldButton.disabled = !canExportCustomProtein(project);
    var receptorAtoms = project.system.components.reduce(function (count, component) {
      return count + (component.atoms ? component.atoms.length : 0);
    }, 0);
    var ligandAtoms = assets.ligand && assets.ligand.atoms ? assets.ligand.atoms.length : 0;
    refs.metrics.innerHTML =
      metricMarkup("Backbone points", receptorAtoms || "-") +
      metricMarkup("Ligand atoms", ligandAtoms || "-") +
      metricMarkup("Components", project.system.components.length || "-");
    renderComponents();
    renderInteraction();
    drawStructure();
  }

  function renderComponents() {
    var project = currentProject();
    var components = project.system.components;
    refs.componentCount.textContent = String(components.length);
    refs.componentList.innerHTML = "";
    if (!components.length) {
      refs.componentList.innerHTML = "<div class=\"blank-list\">No proteins added</div>";
      return;
    }
    if (!project.viewer.componentId || !components.some(function (component) { return component.id === project.viewer.componentId; })) {
      project.viewer.componentId = components[components.length - 1].id;
      saveState();
    }
    components.forEach(function (component) {
      var row = document.createElement("div");
      var head = document.createElement("div");
      var copy = document.createElement("span");
      var title = document.createElement("strong");
      var detail = document.createElement("small");
      var viewing = document.createElement("span");
      var remove = document.createElement("button");
      row.className = "component-row";
      row.classList.toggle("active", component.id === project.viewer.componentId);
      head.className = "component-row-head";
      head.title = "Show this structure in the preview";
      title.textContent = component.label;
      detail.textContent = componentDetail(component);
      viewing.className = "component-viewing";
      viewing.textContent = "Viewing";
      remove.className = "component-remove";
      remove.type = "button";
      remove.title = "Remove component";
      remove.textContent = "\u00d7";
      remove.addEventListener("click", function (event) {
        event.stopPropagation();
        var wasViewing = currentProject().viewer.componentId === component.id;
        currentProject().system.components = currentProject().system.components.filter(function (item) {
          return item.id !== component.id;
        });
        var remaining = currentProject().system.components;
        if (!remaining.length) {
          currentProject().viewer.componentId = null;
        } else if (wasViewing) {
          currentProject().viewer.componentId = remaining[remaining.length - 1].id;
        }
        currentProject().assets.receptor = remaining.length ? {
          name: remaining[remaining.length - 1].label,
          atoms: remaining[remaining.length - 1].atoms
        } : null;
        touchProject();
        renderAssets();
      });
      head.addEventListener("click", function () {
        selectViewerComponent(component.id);
      });
      copy.appendChild(title);
      copy.appendChild(detail);
      head.appendChild(copy);
      head.appendChild(viewing);
      head.appendChild(remove);
      row.appendChild(head);
      renderComponentChains(row, component);
      refs.componentList.appendChild(row);
    });
  }

  function selectViewerComponent(componentId) {
    var project = currentProject();
    if (project.viewer.componentId === componentId) {
      return;
    }
    project.viewer.componentId = componentId;
    project.modified = new Date().toISOString();
    saveState();
    renderProjects();
    renderComponents();
    drawStructure();
  }

  function renderComponentChains(row, component) {
    var chainDetails = componentChainDetails(component);
    if (!chainDetails.length) {
      return;
    }
    var list = document.createElement("div");
    list.className = "component-chains";
    chainDetails.forEach(function (chain) {
      var label = document.createElement("label");
      var checkbox = document.createElement("input");
      var copy = document.createElement("span");
      var type = document.createElement("strong");
      var detail = document.createElement("small");
      label.className = "component-chain";
      checkbox.type = "checkbox";
      checkbox.checked = retainedComponentChains(component).indexOf(chain.id) !== -1;
      checkbox.addEventListener("change", function () {
        var retained = retainedComponentChains(component);
        component.retainedChains = checkbox.checked ?
          Array.from(new Set(retained.concat(chain.id))) :
          retained.filter(function (chainId) { return chainId !== chain.id; });
        syncInteractionChains(currentProject());
        touchProject();
        renderAssets();
      });
      type.textContent = "Chain " + chain.id + " - " + chain.type;
      detail.textContent = chain.residues + " residues - " + chain.atoms + " atoms";
      copy.appendChild(type);
      copy.appendChild(detail);
      label.appendChild(checkbox);
      label.appendChild(copy);
      list.appendChild(label);
    });
    row.appendChild(list);
  }

  function componentDetail(component) {
    var sourceLabel = component.source === "rcsb" ? "PDB " + component.sourceId :
      component.source === "demo" ? "Example based on " + component.sourceId :
        component.source === "colabfold" ? "LocalColabFold structure" : "Local file";
    var details = [sourceLabel];
    if (component.metadata && component.metadata.chains.length) {
      details.push(component.metadata.chains.length + " chains");
    }
    if (component.metadata && component.metadata.ligands.length) {
      details.push(component.metadata.ligands.slice(0, 4).join(", "));
    }
    return details.join(" - ");
  }

  function renderInteraction() {
    var project = currentProject();
    var interaction = project.interaction;
    var components = project.system.components;
    var hasPair = components.length >= 2;
    interaction.enabled = true;
    if (hasPair) {
      interaction.receptorId = interaction.receptorId || components[0].id;
      interaction.partnerId = interaction.partnerId || components[1].id;
    }
    refs.interactionBody.classList.toggle("disabled", !hasPair);
    populateComponentSelect(refs.interactionReceptor, components, interaction.receptorId, "Choose receptor");
    populateComponentSelect(refs.interactionPartner, components, interaction.partnerId, "Choose partner");
    syncInteractionChains(project);
    populateChainSelect(refs.interactionReceptorChain, interactionComponent(project, interaction.receptorId), interaction.receptorChain);
    populateChainSelect(refs.interactionPartnerChain, interactionComponent(project, interaction.partnerId), interaction.partnerChain);
    refs.interactionGuidance.value = interaction.guidance;
    refs.interactionGuidance.disabled = interaction.method !== "haddock3";
    refs.restraintGrid.hidden = interaction.method !== "haddock3" || interaction.guidance === "blind";
    refs.receptorRestraints.value = interaction.receptorRestraints || "";
    refs.partnerRestraints.value = interaction.partnerRestraints || "";
    refs.exportHaddockButton.disabled = !canExportHaddock(project);
    refs.exportHaddockButton.title = canExportHaddock(project) ?
      "Export HADDOCK3 configuration, staging helper, and Argon SGE CPU job" :
      "Choose two different protein components to export an Argon docking job";
    refs.interactionMethods.forEach(function (button) {
      button.classList.toggle("active", button.dataset.method === interaction.method);
    });
    if (!hasPair) {
      refs.interactionStatus.textContent = "Add two protein components to configure an interaction workflow.";
      refs.interactionStatus.classList.remove("ready");
    } else if (!interaction.receptorId || !interaction.partnerId || interaction.receptorId === interaction.partnerId) {
      refs.interactionStatus.textContent = "Choose two different components for the interaction workflow.";
      refs.interactionStatus.classList.remove("ready");
    } else if (interaction.guidance !== "blind" && (!parseResidueList(interaction.receptorRestraints).length || !parseResidueList(interaction.partnerRestraints).length)) {
      refs.interactionStatus.textContent = "Enter receptor and partner residue numbers to export ambiguous HADDOCK3 restraints.";
      refs.interactionStatus.classList.remove("ready");
    } else if (!canExportHaddock(project)) {
      refs.interactionStatus.textContent = "Choose a retained Protein chain for both docking roles. DNA and RNA chains remain available for inspection but cannot be exported to this protein-protein workflow.";
      refs.interactionStatus.classList.remove("ready");
    } else {
      refs.interactionStatus.textContent = interactionSummary(interaction) + " Staged chains are assigned HADDOCK IDs A and B.";
      refs.interactionStatus.classList.add("ready");
    }
  }

  function populateComponentSelect(select, components, selectedId, placeholder) {
    select.innerHTML = "";
    var option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
    components.forEach(function (component) {
      var componentOption = document.createElement("option");
      componentOption.value = component.id;
      componentOption.textContent = component.sourceId ? component.sourceId + " - " + component.label : component.label;
      componentOption.selected = component.id === selectedId;
      select.appendChild(componentOption);
    });
  }

  function populateChainSelect(select, component, selectedChain) {
    select.innerHTML = "";
    var chains = componentChainDetails(component).filter(function (chain) {
      return retainedComponentChains(component).indexOf(chain.id) !== -1;
    });
    if (!chains.length) {
      var emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "No retained chains";
      select.appendChild(emptyOption);
      return;
    }
    chains.forEach(function (chain) {
      var option = document.createElement("option");
      option.value = chain.id;
      option.textContent = "Chain " + chain.id + " - " + chain.type;
      option.selected = chain.id === selectedChain;
      select.appendChild(option);
    });
  }

  function syncInteractionChains(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorChains = receptor ? retainedComponentChains(receptor) : [];
    var partnerChains = partner ? retainedComponentChains(partner) : [];
    if (receptor && receptorChains.indexOf(project.interaction.receptorChain) === -1) {
      project.interaction.receptorChain = preferredProteinChain(receptor);
    }
    if (partner && partnerChains.indexOf(project.interaction.partnerChain) === -1) {
      project.interaction.partnerChain = preferredProteinChain(partner);
    }
  }

  function interactionSummary(interaction) {
    if (interaction.method === "haddock3") {
      return "Planned: HADDOCK3 protein docking, then select a ranked complex pose for GROMACS.";
    }
    if (interaction.method === "usalign") {
      return "Planned: US-align structural overlay for comparison; this does not predict binding.";
    }
    return "Planned: manual placement must be reviewed before a GROMACS complex is prepared.";
  }

  function canExportHaddock(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    return project.interaction.method === "haddock3" &&
      project.interaction.receptorId &&
      project.interaction.partnerId &&
      project.interaction.receptorId !== project.interaction.partnerId &&
      receptor &&
      partner &&
      isRetainedProteinChain(receptor, project.interaction.receptorChain) &&
      isRetainedProteinChain(partner, project.interaction.partnerChain) &&
      (project.interaction.guidance === "blind" ||
        (parseResidueList(project.interaction.receptorRestraints).length &&
          parseResidueList(project.interaction.partnerRestraints).length));
  }

  function canExportColabfold(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    return project.interaction.receptorId &&
      project.interaction.partnerId &&
      project.interaction.receptorId !== project.interaction.partnerId &&
      receptor &&
      partner &&
      isRetainedProteinChain(receptor, project.interaction.receptorChain) &&
      isRetainedProteinChain(partner, project.interaction.partnerChain);
  }

  function interactionComponent(project, componentId) {
    return project.system.components.find(function (component) {
      return component.id === componentId;
    });
  }

  function updateInteractionWorkflowStep() {
    var project = currentProject();
    var step = project.workflow.steps.find(function (workflowStep) {
      return workflowStep.id === "interaction_build";
    });
    if (!step) {
      return;
    }
    step.enabled = true;
    step.engine = project.interaction.method === "haddock3" ? "HADDOCK3" : project.interaction.method === "usalign" ? "US-align" : "Manual";
    step.detail = project.interaction.method === "haddock3" ? "Protein docking" : project.interaction.method === "usalign" ? "Structure overlay" : "Manual placement";
  }

  function metricMarkup(label, value) {
    return "<div class=\"metric\"><span>" + label + "</span><strong>" + value + "</strong></div>";
  }

  function renderWorkflow() {
    var workflow = currentProject().workflow;
    refs.preset.value = workflow.preset;
    refs.ph.value = workflow.settings.ph;
    refs.poses.value = workflow.settings.poses;
    refs.md.value = workflow.settings.mdNanoseconds;
    refs.workflowSteps.innerHTML = "";
    workflow.steps.forEach(function (step, index) {
      var row = document.createElement("label");
      row.className = "step-row";
      row.innerHTML =
        "<input type=\"checkbox\"" + (step.enabled ? " checked" : "") + ">" +
        "<span><strong>" + step.label + "</strong><small>" + step.detail + "</small></span>" +
        "<span class=\"engine-tag\">" + step.engine + "</span>";
      row.querySelector("input").addEventListener("change", function (event) {
        workflow.steps[index].enabled = event.target.checked;
        touchProject();
      });
      refs.workflowSteps.appendChild(row);
    });
    renderExecution();
  }

  function renderExecution() {
    var execution = currentProject().execution;
    var supportsCluster = currentProject().workflow.steps.some(function (step) {
      return step.enabled && step.engine === "GROMACS";
    });
    refs.clusterEnabled.checked = execution.enabled;
    refs.clusterEnabled.disabled = !supportsCluster;
    refs.exportScriptButton.disabled = !supportsCluster;
    refs.exportScriptButton.title = supportsCluster ? "Export Argon SGE GROMACS job script" : "Select a GROMACS workflow to export an SGE job script";
    refs.clusterHost.value = execution.sshHost;
    refs.clusterPort.value = execution.sshPort;
    refs.clusterQueue.value = execution.queue;
    refs.clusterPrerequisite.value = execution.prerequisiteModule;
    refs.clusterModule.value = execution.module;
    refs.clusterCommand.value = execution.command;
    refs.clusterGpuSupport.value = execution.gpuSupport;
    refs.clusterTime.value = execution.walltime;
    refs.clusterCpus.value = execution.cpus;
    refs.clusterGpu.checked = execution.gpu;
    refs.clusterGpu.disabled = execution.gpuSupport !== "enabled";
    refs.clusterFields.classList.toggle("disabled", !execution.enabled || !supportsCluster);
    refs.clusterGpu.parentElement.classList.toggle("disabled", !execution.enabled || !supportsCluster);
    if (execution.gpuSupport === "disabled") {
      refs.executionNote.textContent = "Detected gmx 2016.3 has GPU support disabled. Export is CPU-only until a GPU-enabled Argon module is confirmed.";
      refs.executionNote.classList.add("warning");
    } else if (execution.gpuSupport === "unknown") {
      refs.executionNote.textContent = "Modern Argon GROMACS load chain is configured. GPU execution remains off until gmx --version confirms GPU support.";
      refs.executionNote.classList.add("warning");
    } else {
      refs.executionNote.innerHTML = "CUDA-enabled Argon GROMACS confirmed. Uses <code>UI-GPU</code> with <code>ngpus=1</code> when GPU allocation is selected.";
      refs.executionNote.classList.remove("warning");
    }
  }

  function renderRuns() {
    var runs = currentProject().runs;
    refs.runCount.textContent = String(runs.length);
    refs.runList.innerHTML = "";
    if (!runs.length) {
      refs.runList.innerHTML = "<div class=\"blank-list\">No run plans yet</div>";
      return;
    }
    runs.slice().reverse().forEach(function (run) {
      var row = document.getElementById("run-template").content.firstElementChild.cloneNode(true);
      row.querySelector("strong").textContent = run.label;
      row.querySelector("small").textContent = run.steps + " stages - " + shortDate(run.created);
      row.querySelector(".run-state").textContent = run.state;
      refs.runList.appendChild(row);
    });
  }

  function render() {
    var project = currentProject();
    refs.projectName.value = project.name;
    refs.projectStatus.textContent = project.status;
    renderWorkspaceProfile(project);
    renderProjects();
    renderEngines();
    renderAssets();
    renderWorkflow();
    renderResults();
    renderAnalysis();
    renderRuns();
    renderWorkflowStep();
  }

  function renderWorkspaceProfile(project) {
    var workspace = project.workspace || defaultWorkspaceProfile(project.name);
    refs.workspaceLocalPath.value = workspace.localPath || "";
    refs.workspaceArgonHost.value = workspace.host || "";
    refs.workspaceArgonPort.value = workspace.port || 22;
    refs.workspaceArgonPath.value = workspace.remotePath || "";
  }

  function syncButtons(disabled) {
    [refs.syncPush, refs.syncPull].filter(Boolean).forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function runWorkspaceSync(action) {
    var project = currentProject();
    if (!window.ezDesktop || !window.ezDesktop.syncWorkspace) {
      refs.syncStatus.textContent = "Command execution is only available in the desktop app.";
      return;
    }
    refs.syncStatus.textContent = "Running " + action.replace(/-/g, " ") + "...";
    refs.syncOutput.textContent = "Starting rsync...";
    syncButtons(true);
    window.ezDesktop.syncWorkspace({
      action: action,
      profile: project.workspace
    }).then(function (result) {
      refs.syncStatus.textContent = result.launched ? "Interactive sync terminal opened." :
        result.ok ? "Sync finished." : "Sync failed with exit code " + result.exitCode + ".";
      refs.syncOutput.textContent = result.command + "\n\n" + (result.output || "(no output)");
    }).catch(function (error) {
      refs.syncStatus.textContent = "Sync failed.";
      refs.syncOutput.textContent = error.message || String(error);
    }).finally(function () {
      syncButtons(false);
    });
  }

  function renderWorkflowStep() {
    refs.dashboard.classList.remove("step-proteins", "step-haddock", "step-gromacs");
    refs.dashboard.classList.add("step-" + activeWorkflowStep);
    refs.workflowTabs.forEach(function (tab) {
      tab.classList.toggle("active", tab.dataset.workflowStep === activeWorkflowStep);
    });
    refs.workflowPanels.forEach(function (panel) {
      panel.classList.toggle("step-hidden", panel.dataset.step !== activeWorkflowStep);
    });
    window.requestAnimationFrame(function () {
      if (activeWorkflowStep === "proteins") {
        resizeStructureViewer();
      }
      if (activeWorkflowStep === "haddock") {
        resizeDockViewer();
      }
      if (activeWorkflowStep === "gromacs") {
        drawAnalysisPlot((currentProject().analysis || defaultAnalysis()).plots.find(function (plot) {
          return plot.id === currentProject().analysis.selectedPlotId;
        }) || null);
      }
    });
  }

  function setWorkflowStep(step) {
    if (activeWorkflowStep === step) {
      return;
    }
    activeWorkflowStep = step;
    renderWorkflowStep();
  }

  function parsePdb(text) {
    var atoms = [];
    var backbone = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!/^ATOM  |^HETATM/.test(line)) {
        return;
      }
      var x = Number(line.slice(30, 38));
      var y = Number(line.slice(38, 46));
      var z = Number(line.slice(46, 54));
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        var atom = {
          x: x,
          y: y,
          z: z,
          element: line.slice(76, 78).trim() || line.slice(12, 14).trim(),
          chain: line.slice(21, 22).trim()
        };
        atoms.push(atom);
        if (line.slice(12, 16).trim() === "CA") {
          backbone.push(atom);
        }
      }
    });
    return (backbone.length ? backbone : atoms).slice(0, 3500);
  }

  function parsePdbContactAtoms(text) {
    var atoms = [];
    text.split(/\r?\n/).forEach(function (line) {
      if (!/^ATOM  /.test(line)) {
        return;
      }
      var x = Number(line.slice(30, 38));
      var y = Number(line.slice(38, 46));
      var z = Number(line.slice(46, 54));
      var residue = Number(line.slice(22, 26));
      var element = line.slice(76, 78).trim() || line.slice(12, 14).trim();
      var atomName = line.slice(12, 16).trim();
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(residue)) {
        return;
      }
      if (/^H/i.test(element) || /^H/i.test(atomName)) {
        return;
      }
      atoms.push({
        x: x,
        y: y,
        z: z,
        chain: line.slice(21, 22).trim(),
        residue: residue
      });
    });
    return atoms;
  }

  function compressResidueRanges(residues) {
    var values = Array.from(new Set(residues)).sort(function (left, right) {
      return left - right;
    });
    var ranges = [];
    var index = 0;
    while (index < values.length) {
      var start = values[index];
      var end = start;
      while (index + 1 < values.length && values[index + 1] === end + 1) {
        index += 1;
        end = values[index];
      }
      ranges.push(start === end ? String(start) : start + "-" + end);
      index += 1;
    }
    return ranges.join(", ");
  }

  function interfaceResidueSetsFromPdb(text, cutoffAngstroms) {
    var cutoffSquared = cutoffAngstroms * cutoffAngstroms;
    var receptorAtoms = [];
    var partnerAtoms = [];
    parsePdbContactAtoms(text).forEach(function (atom) {
      if (atom.chain === "A") {
        receptorAtoms.push(atom);
      } else if (atom.chain === "B") {
        partnerAtoms.push(atom);
      }
    });
    var receptorResidues = {};
    var partnerResidues = {};
    receptorAtoms.forEach(function (left) {
      partnerAtoms.forEach(function (right) {
        var dx = left.x - right.x;
        var dy = left.y - right.y;
        var dz = left.z - right.z;
        if (dx * dx + dy * dy + dz * dz <= cutoffSquared) {
          receptorResidues[left.residue] = true;
          partnerResidues[right.residue] = true;
        }
      });
    });
    return {
      receptor: Object.keys(receptorResidues).map(Number),
      partner: Object.keys(partnerResidues).map(Number)
    };
  }

  function rankedResiduesFromCounts(counts) {
    return Object.keys(counts).map(function (residue) {
      return { residue: Number(residue), count: counts[residue] };
    }).sort(function (left, right) {
      return (right.count - left.count) || (left.residue - right.residue);
    });
  }

  function consensusResidues(ranked, modelCount) {
    if (!ranked.length) {
      return [];
    }
    var threshold = Math.max(1, Math.ceil(modelCount * 0.25));
    var filtered = ranked.filter(function (item) {
      return item.count >= threshold;
    });
    return (filtered.length ? filtered : ranked.slice(0, 12)).map(function (item) {
      return item.residue;
    });
  }

  function rankedResiduePreview(ranked) {
    return ranked.slice(0, 6).map(function (item) {
      return item.residue + " (" + item.count + ")";
    }).join(", ");
  }

  function inferInterfaceResiduesFromPdbTexts(items, cutoffAngstroms) {
    var receptorCounts = {};
    var partnerCounts = {};
    var modelsWithContacts = 0;
    items.forEach(function (item) {
      var sets = interfaceResidueSetsFromPdb(item.text, cutoffAngstroms);
      if (!sets.receptor.length || !sets.partner.length) {
        return;
      }
      modelsWithContacts += 1;
      sets.receptor.forEach(function (residue) {
        receptorCounts[residue] = (receptorCounts[residue] || 0) + 1;
      });
      sets.partner.forEach(function (residue) {
        partnerCounts[residue] = (partnerCounts[residue] || 0) + 1;
      });
    });
    var receptorRanked = rankedResiduesFromCounts(receptorCounts);
    var partnerRanked = rankedResiduesFromCounts(partnerCounts);
    var receptorConsensus = consensusResidues(receptorRanked, modelsWithContacts);
    var partnerConsensus = consensusResidues(partnerRanked, modelsWithContacts);
    return {
      receptor: compressResidueRanges(receptorConsensus),
      partner: compressResidueRanges(partnerConsensus),
      receptorCount: receptorConsensus.length,
      partnerCount: partnerConsensus.length,
      receptorPreview: rankedResiduePreview(receptorRanked),
      partnerPreview: rankedResiduePreview(partnerRanked),
      receptorTopCount: receptorRanked[0] ? receptorRanked[0].count : 0,
      partnerTopCount: partnerRanked[0] ? partnerRanked[0].count : 0,
      modelsWithContacts: modelsWithContacts,
      modelCount: items.length
    };
  }

  function parsePdbMetadata(text, pdbId) {
    var title = text.split(/\r?\n/).filter(function (line) {
      return line.slice(0, 5) === "TITLE";
    }).map(function (line) {
      return line.slice(10).trim();
    }).join(" ").replace(/\s+/g, " ").trim();
    var resolutionMatch = text.match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROMS/i);
    var chainSet = {};
    var chainRecords = {};
    var ligandSet = {};
    text.split(/\r?\n/).forEach(function (line) {
      if (/^ATOM  /.test(line) && line.slice(21, 22).trim()) {
        var chain = line.slice(21, 22).trim();
        var residue = line.slice(17, 20).trim();
        var residueId = line.slice(22, 27).trim();
        chainSet[chain] = true;
        chainRecords[chain] = chainRecords[chain] || { residues: {}, atoms: 0, residueNames: {} };
        chainRecords[chain].atoms += 1;
        chainRecords[chain].residues[residueId] = true;
        chainRecords[chain].residueNames[residue] = true;
      }
      if (/^HETNAM/.test(line)) {
        var ligand = line.slice(11, 14).trim();
        if (ligand && ligand !== "HOH") {
          ligandSet[ligand] = true;
        }
      }
    });
    return {
      pdbId: pdbId,
      title: title || "RCSB PDB structure " + pdbId,
      resolution: resolutionMatch ? resolutionMatch[1] : null,
      chains: Object.keys(chainSet),
      chainDetails: Object.keys(chainSet).map(function (chain) {
        return {
          id: chain,
          type: pdbChainType(Object.keys(chainRecords[chain].residueNames)),
          residues: Object.keys(chainRecords[chain].residues).length,
          atoms: chainRecords[chain].atoms
        };
      }),
      ligands: Object.keys(ligandSet)
    };
  }

  function pdbChainType(residueNames) {
    var dnaResidues = ["DA", "DC", "DG", "DT", "DI"];
    var rnaResidues = ["A", "C", "G", "U", "I"];
    if (residueNames.length && residueNames.every(function (residue) { return dnaResidues.indexOf(residue) !== -1; })) {
      return "DNA";
    }
    if (residueNames.length && residueNames.every(function (residue) { return rnaResidues.indexOf(residue) !== -1; })) {
      return "RNA";
    }
    return "Protein";
  }

  function componentChainDetails(component) {
    var chains = component && component.metadata && component.metadata.chains || [];
    var details = component && component.metadata && component.metadata.chainDetails || [];
    return chains.map(function (chain) {
      return details.find(function (detail) { return detail.id === chain; }) || {
        id: chain,
        type: "Unknown",
        residues: "-",
        atoms: "-"
      };
    });
  }

  function normalizeComponentChains(component) {
    component.metadata = component.metadata || { chains: [], ligands: [], resolution: null };
    component.metadata.chains = component.metadata.chains || [];
    component.metadata.chainDetails = component.metadata.chainDetails || component.metadata.chains.map(function (chain) {
      return { id: chain, type: "Unknown", residues: "-", atoms: "-" };
    });
    if (!Array.isArray(component.retainedChains)) {
      component.retainedChains = component.metadata.chainDetails.filter(function (chain) {
        return chain.type === "Protein";
      }).map(function (chain) {
        return chain.id;
      });
      if (!component.retainedChains.length) {
        component.retainedChains = component.metadata.chains.slice();
      }
    }
  }

  function retainedComponentChains(component) {
    normalizeComponentChains(component);
    return component.retainedChains;
  }

  function preferredProteinChain(component) {
    var retained = retainedComponentChains(component);
    var protein = componentChainDetails(component).find(function (chain) {
      return retained.indexOf(chain.id) !== -1 && chain.type === "Protein";
    });
    return protein ? protein.id : retained[0] || null;
  }

  function isRetainedProteinChain(component, chainId) {
    return retainedComponentChains(component).indexOf(chainId) !== -1 &&
      componentChainDetails(component).some(function (chain) {
        return chain.id === chainId && chain.type === "Protein";
      });
  }

  function parsePdbHetero(text, residueName) {
    return text.split(/\r?\n/).filter(function (line) {
      return /^HETATM/.test(line) && line.slice(17, 20).trim() === residueName;
    }).map(function (line) {
      return {
        x: Number(line.slice(30, 38)),
        y: Number(line.slice(38, 46)),
        z: Number(line.slice(46, 54)),
        element: line.slice(76, 78).trim() || line.slice(12, 14).trim()
      };
    }).filter(function (atom) {
      return Number.isFinite(atom.x) && Number.isFinite(atom.y) && Number.isFinite(atom.z);
    });
  }

  function addProteinComponent(component) {
    currentProject().system.components.push(component);
    currentProject().assets.receptor = { name: component.label, atoms: component.atoms };
    currentProject().viewer.componentId = component.id;
  }

  function clearStructurePreview(project) {
    if (!project.results) {
      return;
    }
    project.results.preview = null;
    project.results.selectedId = null;
    project.results.selectedComplex = null;
  }

  function fetchRcsbStructure() {
    var pdbId = refs.pdbId.value.trim().toUpperCase();
    if (!/^[0-9A-Z]{4}$/.test(pdbId)) {
      refs.pdbStatus.textContent = "Enter a four-character PDB ID, for example 3LN1.";
      refs.pdbStatus.classList.add("error");
      return;
    }
    if (!window.ezDesktop || !window.ezDesktop.fetchPdb) {
      refs.pdbStatus.textContent = "RCSB import is available in the desktop application.";
      refs.pdbStatus.classList.add("error");
      return;
    }
    refs.fetchPdb.disabled = true;
    refs.pdbStatus.classList.remove("error");
    refs.pdbStatus.textContent = "Fetching " + pdbId + " from RCSB PDB...";
    window.ezDesktop.fetchPdb(pdbId).then(function (result) {
      var metadata = parsePdbMetadata(result.text, result.pdbId);
      var component = {
        id: uid(),
        label: metadata.title,
        source: "rcsb",
        sourceId: result.pdbId,
        sourceUrl: result.url,
        pdbText: result.text,
        atoms: parsePdb(result.text),
        metadata: metadata,
        visible: true
      };
      currentProject().system.components = currentProject().system.components.filter(function (item) {
        return !(item.source === "demo" && item.sourceId === result.pdbId);
      });
      clearStructurePreview(currentProject());
      addProteinComponent(component);
      if (metadata.ligands.indexOf("CEL") !== -1) {
        currentProject().assets.ligand = {
          name: "CEL (" + result.pdbId + ")",
          atoms: parsePdbHetero(result.text, "CEL"),
          bonds: []
        };
      }
      currentProject().status = "Configured";
      touchProject();
      renderAssets();
      refs.projectStatus.textContent = currentProject().status;
      refs.pdbStatus.textContent = "Imported " + result.pdbId + (metadata.resolution ? " - " + metadata.resolution + " A resolution" : "") + ".";
    }).catch(function (error) {
      refs.pdbStatus.textContent = error.message || "Unable to fetch this PDB entry.";
      refs.pdbStatus.classList.add("error");
    }).finally(function () {
      refs.fetchPdb.disabled = false;
    });
  }

  function parseSdf(text) {
    var lines = text.split(/\r?\n/);
    var counts = lines[3] || "";
    var atomCount = Number(counts.slice(0, 3));
    var bondCount = Number(counts.slice(3, 6));
    var atoms = [];
    var bonds = [];
    if (!Number.isFinite(atomCount)) {
      return { atoms: [], bonds: [] };
    }
    for (var index = 4; index < 4 + atomCount; index += 1) {
      var line = lines[index] || "";
      atoms.push({
        x: Number(line.slice(0, 10)) || 0,
        y: Number(line.slice(10, 20)) || 0,
        z: Number(line.slice(20, 30)) || 0,
        element: line.slice(31, 34).trim() || "C"
      });
    }
    for (var bondIndex = 4 + atomCount; bondIndex < 4 + atomCount + bondCount; bondIndex += 1) {
      var bondLine = lines[bondIndex] || "";
      bonds.push({
        from: Number(bondLine.slice(0, 3)) - 1,
        to: Number(bondLine.slice(3, 6)) - 1
      });
    }
    return { atoms: atoms, bonds: bonds };
  }

  function readResultsDirectory(files) {
    var project = currentProject();
    var pdbFiles = Array.from(files || []).filter(function (file) {
      return /\.pdb(?:\.gz)?$/i.test(file.name);
    });
    var scoreFiles = Array.from(files || []).filter(function (file) {
      return /\.(tsv|csv)$/i.test(file.name) && /capri|cluster|score|ranking/i.test(file.name);
    }).sort(function (first, second) {
      return resultTablePriority(first.name) - resultTablePriority(second.name);
    }).slice(0, 12);
    Promise.all(scoreFiles.map(function (file) {
      return file.text();
    })).then(function (tableTexts) {
      var metadata = resultMetadataMap(tableTexts);
      var matchedFiles = pdbFiles.filter(function (file) {
        return Boolean(resultMetadata(metadata, file.name));
      });
      var rankedFiles = pdbFiles.filter(function (file) {
        var relativePath = file.webkitRelativePath || file.name;
        return /capri|clust|cluster|rank|model|emref/i.test(relativePath);
      });
      var candidateFiles = dedupeResultFiles((matchedFiles.length ? matchedFiles : rankedFiles.length ? rankedFiles : pdbFiles), metadata).sort(function (first, second) {
        var firstMetadata = resultMetadata(metadata, first.name);
        var secondMetadata = resultMetadata(metadata, second.name);
        if (firstMetadata && secondMetadata && firstMetadata.rank !== secondMetadata.rank) {
          return firstMetadata.rank - secondMetadata.rank;
        }
        return (first.webkitRelativePath || first.name).localeCompare(second.webkitRelativePath || second.name, undefined, { numeric: true });
      }).slice(0, 40);
      var cache = {};
      var candidates = candidateFiles.map(function (file, index) {
        var relativePath = file.webkitRelativePath || file.name;
        var fileMetadata = resultMetadata(metadata, file.name);
        var id = "result_" + index + "_" + file.name;
        cache[id] = file;
        return {
          id: id,
          filename: file.name,
          relativePath: relativePath,
          rank: fileMetadata ? fileMetadata.rank : inferredRank(file.name, index + 1),
          score: fileMetadata ? fileMetadata.score : null
        };
      }).sort(function (first, second) {
        return first.rank - second.rank;
      });
      var phase = haddockUsesAmbiguousRestraints(project) ? "guided" : "blind";
      var scoreSummary = haddockScoreSummary(candidates);
      resultFileCache[project.id] = cache;
      project.results = {
        sourceFolder: files[0] ? String(files[0].webkitRelativePath || "").split("/")[0] || "outputs" : "outputs",
        importedAt: new Date().toISOString(),
        phase: phase,
        candidates: candidates,
        selectedId: null,
        selectedComplex: null,
        preview: null,
        scoreSummary: scoreSummary,
        interfaceInference: null,
        preparation: Object.assign(defaultGromacsPreparation(), project.results && project.results.preparation || {})
      };
      project.haddockHistory = Object.assign(defaultHaddockHistory(), project.haddockHistory || {});
      project.haddockHistory[phase] = {
        importedAt: project.results.importedAt,
        sourceFolder: project.results.sourceFolder,
        candidateCount: candidates.length,
        scoreSummary: scoreSummary
      };
      project.status = candidates.length ? "Results imported" : "No complexes found";
      touchProject();
      renderAssets();
      renderResults();
      refs.projectStatus.textContent = project.status;
    });
  }

  function dedupeResultFiles(files, metadata) {
    var unique = {};
    (files || []).forEach(function (file, index) {
      var relativePath = String(file.webkitRelativePath || file.name || "");
      var normalizedPath = relativePath.replace(/\\/g, "/").toLowerCase();
      var fileMetadata = resultMetadata(metadata || {}, file.name) || {};
      var rank = Number.isFinite(fileMetadata.rank) ? fileMetadata.rank : inferredRank(file.name, index + 1);
      var score = Number.isFinite(fileMetadata.score) ? fileMetadata.score : null;
      var scoreKey = score === null ? "na" : score.toFixed(6);
      var identity = [
        String(file.name || "").toLowerCase(),
        String(rank),
        scoreKey
      ].join("|");
      var pathKey = normalizedPath;
      var existing = unique[pathKey] || unique[identity];
      if (!existing) {
        unique[pathKey] = { file: file, path: normalizedPath, identity: identity };
        unique[identity] = unique[pathKey];
        return;
      }
      var existingDepth = (existing.path.match(/\//g) || []).length;
      var nextDepth = (normalizedPath.match(/\//g) || []).length;
      var currentLooksRanked = /capri|clust|cluster|rank|model|emref/i.test(existing.path);
      var nextLooksRanked = /capri|clust|cluster|rank|model|emref/i.test(normalizedPath);
      if ((!currentLooksRanked && nextLooksRanked) || (currentLooksRanked === nextLooksRanked && nextDepth < existingDepth)) {
        unique[pathKey] = existing;
        unique[identity] = { file: file, path: normalizedPath, identity: identity };
      }
    });
    return Object.keys(unique).filter(function (key) {
      return key.indexOf("|") !== -1;
    }).map(function (key) {
      return unique[key].file;
    });
  }

  function haddockScoreSummary(candidates) {
    var scored = candidates.map(function (candidate) {
      return candidate.score;
    }).filter(Number.isFinite);
    if (!scored.length) {
      return null;
    }
    var sum = 0;
    var min = scored[0];
    var max = scored[0];
    scored.forEach(function (score) {
      sum += score;
      min = Math.min(min, score);
      max = Math.max(max, score);
    });
    return {
      count: scored.length,
      best: min,
      mean: sum / scored.length,
      worst: max,
      spread: max - min
    };
  }

  function inferredRank(filename, fallback) {
    var match = String(filename).match(/(?:rank|model|cluster)[_-]?(\d+)/i) || String(filename).match(/(\d+)/);
    return match ? Number(match[1]) : fallback;
  }

  function resultTablePriority(filename) {
    if (/capri_ss/i.test(filename)) {
      return 0;
    }
    if (/clustfcc/i.test(filename)) {
      return 1;
    }
    return 2;
  }

  function resultMetadata(metadata, filename) {
    return metadata[filename] || metadata[String(filename).replace(/\.gz$/i, "")] || null;
  }

  function resultMetadataMap(tableTexts) {
    var metadata = {};
    tableTexts.forEach(function (text) {
      var rows = text.trim().split(/\r?\n/);
      if (rows.length < 2) {
        return;
      }
      var separator = rows[0].indexOf("\t") !== -1 ? "\t" : ",";
      var headers = rows[0].split(separator).map(function (heading) { return heading.toLowerCase(); });
      var fileColumn = headers.findIndex(function (heading) { return /model|structure|file|pdb/.test(heading); });
      var scoreColumn = headers.findIndex(function (heading) { return /haddock.*score|score/.test(heading); });
      var rankColumn = headers.findIndex(function (heading) { return /caprieval_rank|^rank$|ranking/.test(heading); });
      if (fileColumn === -1 || scoreColumn === -1 || rankColumn === -1) {
        return;
      }
      rows.slice(1).forEach(function (row) {
        var cells = row.split(separator);
        var file = (cells[fileColumn] || "").trim().split(/[\\/]/).pop();
        var score = Number((cells[scoreColumn] || "").trim());
        var rank = Number((cells[rankColumn] || "").trim());
        if (file && Number.isFinite(score) && Number.isFinite(rank) && !metadata[file]) {
          metadata[file] = { rank: rank, score: score };
        }
      });
    });
    return metadata;
  }

  function readResultFileText(file) {
    if (!/\.gz$/i.test(file.name)) {
      return file.text();
    }
    if (typeof DecompressionStream === "undefined") {
      return Promise.reject(new Error("This desktop runtime cannot decompress HADDOCK3 .pdb.gz files."));
    }
    return new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }

  function loadResultComplex(candidate, chooseForGromacs) {
    var project = currentProject();
    var file = resultFileCache[project.id] && resultFileCache[project.id][candidate.id];
    if (!file) {
      refs.resultStatus.textContent = "Re-import the outputs folder to load this structure preview.";
      return;
    }
    readResultFileText(file).then(function (text) {
      var complex = {
        candidateId: candidate.id,
        filename: candidate.filename,
        relativePath: candidate.relativePath,
        rank: candidate.rank,
        score: candidate.score,
        pdbText: text,
        atoms: parsePdb(text)
      };
      project.results.preview = complex;
      project.viewer.componentId = null;
      if (chooseForGromacs) {
        project.results.selectedId = candidate.id;
        project.results.selectedComplex = complex;
        project.status = "Complex selected";
      }
      touchProject();
      renderAssets();
      renderResults();
      refs.projectStatus.textContent = project.status;
      if (chooseForGromacs) {
        setWorkflowStep("gromacs");
      }
    }).catch(function (error) {
      refs.resultStatus.textContent = error.message || "Unable to read this HADDOCK3 structure.";
    });
  }

  function inferInterfaceRestraints() {
    var project = currentProject();
    var results = project.results || defaultResults();
    var cache = resultFileCache[project.id] || {};
    if (!results.candidates.length) {
      refs.resultStatus.textContent = "Import HADDOCK3 outputs before inferring interface residues.";
      return;
    }
    refs.inferInterfaceButton.disabled = true;
    refs.resultStatus.textContent = "Sampling interfaces across " + results.candidates.length + " HADDOCK3 poses...";
    Promise.all(results.candidates.map(function (candidate) {
      var file = cache[candidate.id];
      if (!file) {
        return Promise.resolve(null);
      }
      return readResultFileText(file).then(function (text) {
        return { candidate: candidate, text: text };
      });
    })).then(function (items) {
      var validItems = items.filter(Boolean);
      var inferred = inferInterfaceResiduesFromPdbTexts(validItems, 5);
      if (!inferred.receptor || !inferred.partner) {
        refs.resultStatus.textContent = "No chain A/B residue contacts found within 5 A across imported poses.";
        return;
      }
      project.interaction.enabled = true;
      project.interaction.method = "haddock3";
      project.interaction.guidance = "interface";
      project.interaction.receptorRestraints = inferred.receptor;
      project.interaction.partnerRestraints = inferred.partner;
      project.results.interfaceInference = {
        modelCount: inferred.modelCount,
        modelsWithContacts: inferred.modelsWithContacts,
        receptorTopCount: inferred.receptorTopCount,
        partnerTopCount: inferred.partnerTopCount,
        receptorPreview: inferred.receptorPreview,
        partnerPreview: inferred.partnerPreview
      };
      if (project.results.phase === "blind") {
        project.haddockHistory = Object.assign(defaultHaddockHistory(), project.haddockHistory || {});
        project.haddockHistory.blind = Object.assign({}, project.haddockHistory.blind || {}, {
          interfaceInference: project.results.interfaceInference
        });
      }
      updateInteractionWorkflowStep();
      touchProject();
      renderInteraction();
      renderWorkflow();
      renderResults();
      refs.resultStatus.textContent = "Ranked interfaces across " + inferred.modelsWithContacts + " of " + inferred.modelCount + " poses. Top receptor: " + inferred.receptorPreview + ". Top partner: " + inferred.partnerPreview + ".";
    }).catch(function (error) {
      refs.resultStatus.textContent = error.message || "Unable to infer interface residues across imported poses.";
    });
  }

  function buildHaddockInterpretation(project) {
    var results = project.results || defaultResults();
    if (!results.candidates.length) {
      return null;
    }
    var history = Object.assign(defaultHaddockHistory(), project.haddockHistory || {});
    var scoreSummary = results.scoreSummary || haddockScoreSummary(results.candidates);
    var phase = results.phase || "unknown";
    var notes = [];
    var markers = 0;

    if (!scoreSummary) {
      notes.push("No HADDOCK score table was found, so Wineinger NHG can rank files but cannot judge score improvement.");
    } else {
      notes.push((phase === "guided" ? "Guided" : phase === "blind" ? "Blind" : "Imported") +
        " best HADDOCK score: " + scoreSummary.best.toFixed(2) +
        " across " + scoreSummary.count + " scored pose" + (scoreSummary.count === 1 ? "" : "s") + ".");
    }

    if (phase === "blind") {
      var inference = results.interfaceInference;
      if (!inference) {
        notes.push("Run Infer interface residues to check whether blind HADDOCK poses converge on a consistent interface.");
      } else {
        var coverage = inference.modelCount ? inference.modelsWithContacts / inference.modelCount : 0;
        var receptorSupport = inference.modelCount ? inference.receptorTopCount / inference.modelCount : 0;
        var partnerSupport = inference.modelCount ? inference.partnerTopCount / inference.modelCount : 0;
        if (coverage < 0.6 || Math.min(receptorSupport, partnerSupport) < 0.35) {
          markers += 1;
          notes.push("Marker: blind HADDOCK runs do not converge on a consistent interface.");
        } else {
          notes.push("Blind poses show a recurring interface signal across imported models.");
        }
      }
    }

    if (phase === "guided") {
      var blindSummary = history.blind && history.blind.scoreSummary;
      if (blindSummary && scoreSummary) {
        var improvement = blindSummary.best - scoreSummary.best;
        var threshold = Math.max(5, Math.abs(blindSummary.best) * 0.15);
        if (improvement <= 0) {
          markers += 1;
          notes.push("Marker: guided runs did not improve over the best blind HADDOCK score.");
        } else if (improvement < threshold) {
          markers += 1;
          notes.push("Marker: guided runs only improve weakly over the best blind HADDOCK score.");
        } else {
          notes.push("Guided runs improve clearly over the saved blind HADDOCK score.");
        }
      } else {
        notes.push("Import blind outputs before guided outputs if you want Wineinger NHG to quantify guided-score improvement.");
      }
      notes.push("Visual review marker: if the best guided pose looks artificial, biologically impossible, or contacts the wrong region, deprioritize it even if the score improved.");
    }

    var status = markers ? "HADDOCK triage warning" :
      phase === "guided" ? "Guided docking looks promising" :
        phase === "blind" ? "Blind docking ready for interface check" : "HADDOCK results imported";
    return {
      status: status,
      tone: markers ? "caution" : "neutral",
      notes: notes
    };
  }

  function renderHaddockInterpretation(project) {
    refs.haddockInterpretation.innerHTML = "";
    var interpretation = buildHaddockInterpretation(project);
    if (!interpretation) {
      refs.haddockInterpretation.hidden = true;
      return;
    }
    refs.haddockInterpretation.hidden = false;
    refs.haddockInterpretation.className = "haddock-interpretation " + interpretation.tone;
    var heading = document.createElement("strong");
    var list = document.createElement("ul");
    heading.textContent = interpretation.status;
    interpretation.notes.forEach(function (note) {
      var item = document.createElement("li");
      item.textContent = note;
      list.appendChild(item);
    });
    refs.haddockInterpretation.appendChild(heading);
    refs.haddockInterpretation.appendChild(list);
  }

  function openLocalColabfoldShell(options) {
    if (!window.ezDesktop || !window.ezDesktop.openLocalColabfold) {
      return Promise.reject(new Error("LocalColabFold launch is only available in the desktop app."));
    }
    var project = currentProject();
    return window.ezDesktop.openLocalColabfold({
      localPath: project.workspace && project.workspace.localPath,
      exportFolderName: options.exportFolderName,
      fastaName: options.fastaName
    });
  }

  function openLocalColabfold() {
    refs.openColabfoldButton.disabled = true;
    refs.colabfoldStatus.textContent = "Opening LocalColabFold in WSL...";
    openLocalColabfoldShell({
      exportFolderName: colabfoldName(currentProject()),
      fastaName: colabfoldName(currentProject()) + ".fasta"
    }).then(function (result) {
      refs.colabfoldStatus.textContent = (result.output || "Opened LocalColabFold in WSL.") +
        (result.command ? " Command: " + result.command : "");
    }).catch(function (error) {
      refs.colabfoldStatus.textContent = error.message || "Unable to open LocalColabFold.";
    }).finally(function () {
      refs.openColabfoldButton.disabled = false;
    });
  }

  function openCustomProteinColabfold() {
    var project = currentProject();
    if (!canExportCustomProtein(project)) {
      refs.customProteinStatus.textContent = "Add a protein name and amino acid sequence before opening LocalColabFold.";
      return;
    }
    refs.openCustomColabfoldButton.disabled = true;
    refs.customProteinStatus.textContent = "Preparing custom-protein ColabFold files...";
    var exportPromise = window.ezDesktop && window.ezDesktop.writeProjectExport ?
      window.ezDesktop.writeProjectExport({
        folderName: customProteinFolderName(project),
        localRoot: project.workspace && project.workspace.localPath,
        files: customProteinExportFiles(project)
      }) :
      Promise.resolve(null);
    exportPromise.then(function () {
      refs.customProteinStatus.textContent = "Opening LocalColabFold in WSL...";
      return openLocalColabfoldShell({
        exportFolderName: customProteinFolderName(project),
        fastaName: customProteinFastaName(project)
      });
    }).then(function (result) {
      refs.customProteinStatus.textContent = (result.output || "Opened LocalColabFold in WSL.") +
        (result.command ? " Command: " + result.command : "");
    }).catch(function (error) {
      refs.customProteinStatus.textContent = error.message || "Unable to open LocalColabFold.";
    }).finally(function () {
      refs.openCustomColabfoldButton.disabled = false;
    });
  }

  function exportColabfoldFiles() {
    var project = currentProject();
    if (!canExportColabfold(project)) {
      refs.colabfoldStatus.textContent = "Choose receptor and partner protein chains before exporting ColabFold files.";
      return;
    }
    try {
      var fasta = colabfoldFasta(project);
      var base = colabfoldName(project);
      var files = [
        { name: base + ".fasta", contents: fasta, mimeType: "text/plain" },
        { name: "run-colabfold.cmd", contents: colabfoldRunScript(project, "cmd"), mimeType: "text/plain" },
        { name: "run-colabfold.sh", contents: colabfoldRunScript(project, "sh"), mimeType: "text/x-shellscript" },
        { name: "README-COLABFOLD.txt", contents: colabfoldInstructions(project), mimeType: "text/plain" }
      ];
      if (window.ezDesktop && window.ezDesktop.writeProjectExport) {
        refs.exportColabfoldButton.disabled = true;
        window.ezDesktop.writeProjectExport({
          folderName: base,
          localRoot: project.workspace && project.workspace.localPath,
          files: files
        }).then(function (result) {
          refs.colabfoldStatus.textContent = "Exported ColabFold files to " + result.folderPath + ".";
        }).catch(function (error) {
          refs.colabfoldStatus.textContent = error.message || "Unable to export ColabFold files.";
        }).finally(function () {
          refs.exportColabfoldButton.disabled = false;
        });
        return;
      }
      files.forEach(function (file) {
        downloadText(file.name, file.contents, file.mimeType);
      });
      refs.colabfoldStatus.textContent = "Downloaded ColabFold FASTA and run scripts.";
    } catch (error) {
      refs.colabfoldStatus.textContent = error.message || "Unable to export ColabFold files.";
    }
  }

  function exportCustomProteinFiles() {
    var project = currentProject();
    if (!canExportCustomProtein(project)) {
      refs.customProteinStatus.textContent = "Add a protein name and amino acid sequence before exporting LocalColabFold files.";
      return;
    }
    try {
      var files = customProteinExportFiles(project);
      if (window.ezDesktop && window.ezDesktop.writeProjectExport) {
        refs.exportCustomColabfoldButton.disabled = true;
        window.ezDesktop.writeProjectExport({
          folderName: customProteinFolderName(project),
          localRoot: project.workspace && project.workspace.localPath,
          files: files
        }).then(function (result) {
          refs.customProteinStatus.textContent = "Exported custom-protein ColabFold files to " + result.folderPath + ".";
        }).catch(function (error) {
          refs.customProteinStatus.textContent = error.message || "Unable to export custom-protein ColabFold files.";
        }).finally(function () {
          refs.exportCustomColabfoldButton.disabled = false;
        });
        return;
      }
      files.forEach(function (file) {
        downloadText(file.name, file.contents, file.mimeType);
      });
      refs.customProteinStatus.textContent = "Downloaded custom-protein ColabFold files.";
    } catch (error) {
      refs.customProteinStatus.textContent = error.message || "Unable to export custom-protein ColabFold files.";
    }
  }

  function importColabfoldResults(files) {
    var pdbFiles = Array.from(files || []).filter(function (file) {
      return /\.pdb$/i.test(file.name);
    }).slice(0, 40);
    if (!pdbFiles.length) {
      refs.colabfoldStatus.textContent = "No ColabFold PDB models found in that folder.";
      return;
    }
    Promise.all(pdbFiles.map(function (file) {
      return file.text().then(function (text) {
        return {
          id: "colabfold_" + filenameSlug(file.name) + "_" + Math.random().toString(36).slice(2, 6),
          filename: file.name,
          relativePath: file.webkitRelativePath || file.name,
          text: text
        };
      });
    })).then(function (items) {
      var project = currentProject();
      var inferred = inferInterfaceResiduesFromPdbTexts(items, 5);
      if (!inferred.receptor || !inferred.partner) {
        refs.colabfoldStatus.textContent = "No chain A/B residue contacts found within 5 A across ColabFold models.";
        return;
      }
      project.colabfold = {
        importedAt: new Date().toISOString(),
        modelCount: inferred.modelCount,
        modelsWithContacts: inferred.modelsWithContacts,
        receptorResidues: inferred.receptor,
        partnerResidues: inferred.partner,
        models: items.map(function (item, index) {
          return {
            id: item.id,
            filename: item.filename,
            relativePath: item.relativePath,
            rank: index + 1
          };
        }),
        selectedModelId: items[0] ? items[0].id : null,
        preview: items[0] ? {
          id: items[0].id,
          filename: items[0].filename,
          relativePath: items[0].relativePath,
          pdbText: items[0].text
        } : null
      };
      colabfoldModelCache[project.id] = {};
      items.forEach(function (item) {
        colabfoldModelCache[project.id][item.id] = item.text;
      });
      project.interaction.enabled = true;
      project.interaction.method = "haddock3";
      project.interaction.guidance = "interface";
      project.interaction.receptorRestraints = inferred.receptor;
      project.interaction.partnerRestraints = inferred.partner;
      updateInteractionWorkflowStep();
      touchProject();
      renderInteraction();
      renderWorkflow();
      renderResults();
      refs.colabfoldStatus.textContent = "ColabFold ranked interfaces across " + inferred.modelsWithContacts + " of " + inferred.modelCount + " models. Top receptor: " + inferred.receptorPreview + ". Top partner: " + inferred.partnerPreview + ".";
    }).catch(function (error) {
      refs.colabfoldStatus.textContent = error.message || "Unable to import ColabFold results.";
    });
  }

  function colabfoldPdbRank(file) {
    var name = String(file && file.name || "");
    var match = name.match(/rank[_-]?0*(\d+)/i);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }

  function selectBestColabfoldPdb(files) {
    return Array.from(files || []).filter(function (file) {
      return /\.pdb$/i.test(file.name);
    }).sort(function (left, right) {
      var leftRank = colabfoldPdbRank(left);
      var rightRank = colabfoldPdbRank(right);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      var leftRelaxed = /relaxed/i.test(left.name) ? 0 : 1;
      var rightRelaxed = /relaxed/i.test(right.name) ? 0 : 1;
      if (leftRelaxed !== rightRelaxed) {
        return leftRelaxed - rightRelaxed;
      }
      return left.name.localeCompare(right.name);
    })[0] || null;
  }

  function importCustomProteinResults(files) {
    var selectedFile = selectBestColabfoldPdb(files);
    if (!selectedFile) {
      refs.customProteinStatus.textContent = "No ColabFold PDB models found in that folder.";
      return;
    }
    selectedFile.text().then(function (text) {
      var project = currentProject();
      var builder = project.proteinBuilder || defaultProteinBuilder();
      var label = (builder.name || "Custom protein").trim();
      var metadata = parsePdbMetadata(text, label);
      var component = {
        id: uid(),
        label: label,
        source: "colabfold",
        sourceId: label,
        pdbText: text,
        atoms: parsePdb(text),
        metadata: metadata,
        visible: true
      };
      clearStructurePreview(project);
      project.system.components = project.system.components.filter(function (item) {
        return !(item.source === "colabfold" && item.sourceId === label);
      });
      addProteinComponent(component);
      project.status = "Configured";
      project.proteinBuilder.importedAt = new Date().toISOString();
      project.proteinBuilder.sourceFolder = selectedFile.webkitRelativePath || selectedFile.name;
      touchProject();
      renderAssets();
      refs.projectStatus.textContent = project.status;
      refs.customProteinStatus.textContent = "Imported " + selectedFile.name + " and added it as \"" + label + "\" in system components.";
    }).catch(function (error) {
      refs.customProteinStatus.textContent = error.message || "Unable to import the custom-protein ColabFold structure.";
    });
  }

  function renderResults() {
    var results = currentProject().results || defaultResults();
    var preparation = results.preparation || defaultGromacsPreparation();
    refs.resultList.innerHTML = "";
    refs.inferInterfaceButton.disabled = !results.candidates.length;
    refs.exportColabfoldButton.disabled = !canExportColabfold(currentProject());
    refs.prepForceField.value = preparation.forceField;
    refs.prepWaterModel.value = preparation.waterModel;
    refs.prepBoxShape.value = preparation.boxShape;
    refs.prepPadding.value = preparation.paddingNanometers;
    refs.prepSalt.value = preparation.saltMolar;
    refs.prepTemperature.value = preparation.temperatureKelvin;
    refs.gromacsPreparation.classList.toggle("disabled", !results.selectedComplex);
    refs.exportGromacsPrepButton.disabled = !results.selectedComplex;
    renderHaddockInterpretation(currentProject());
    renderColabfoldModels(currentProject());
    if (!results.candidates.length) {
      refs.resultStatus.innerHTML = "Import the retrieved Argon <code>outputs</code> folder to review ranked complexes.";
      drawDockedStructure();
      return;
    }
    refs.resultStatus.textContent = results.candidates.length + " candidate complexes found" +
      (results.selectedComplex ? " - selected: " + results.selectedComplex.filename : "") + ".";
    results.candidates.forEach(function (candidate) {
      var row = document.createElement("div");
      var copy = document.createElement("span");
      var title = document.createElement("strong");
      var detail = document.createElement("small");
      var actions = document.createElement("div");
      var preview = document.createElement("button");
      var choose = document.createElement("button");
      row.className = "result-row" + (candidate.id === results.selectedId ? " selected" : "");
      title.textContent = "Rank " + candidate.rank + " - " + candidate.filename;
      detail.textContent = candidate.score === null ? candidate.relativePath : "HADDOCK score " + candidate.score + " - " + candidate.relativePath;
      preview.type = "button";
      preview.textContent = "Preview";
      preview.addEventListener("click", function () { loadResultComplex(candidate, false); });
      choose.type = "button";
      choose.className = "choose-result";
      choose.textContent = candidate.id === results.selectedId ? "Selected" : "Use for MD";
      choose.addEventListener("click", function () { loadResultComplex(candidate, true); });
      copy.appendChild(title);
      copy.appendChild(detail);
      actions.className = "result-actions";
      actions.appendChild(preview);
      actions.appendChild(choose);
      row.appendChild(copy);
      row.appendChild(actions);
      refs.resultList.appendChild(row);
    });
    drawDockedStructure();
  }

  function previewColabfoldModel(model) {
    var project = currentProject();
    var text = colabfoldModelCache[project.id] && colabfoldModelCache[project.id][model.id];
    if (!text && project.colabfold.preview && project.colabfold.preview.id === model.id) {
      text = project.colabfold.preview.pdbText;
    }
    if (!text) {
      refs.colabfoldStatus.textContent = "Re-import the ColabFold output folder to preview this model.";
      return;
    }
    project.colabfold.selectedModelId = model.id;
    project.colabfold.preview = {
      id: model.id,
      filename: model.filename,
      relativePath: model.relativePath,
      pdbText: text
    };
    project.results.preview = null;
    touchProject();
    renderColabfoldModels(project);
    drawDockedStructure();
    refs.colabfoldStatus.textContent = "Previewing ColabFold model " + model.filename + ".";
  }

  function renderColabfoldModels(project) {
    var colabfold = project.colabfold || defaultColabfold();
    refs.colabfoldModelList.innerHTML = "";
    refs.colabfoldReceptorResidues.value = colabfold.receptorResidues || "";
    refs.colabfoldPartnerResidues.value = colabfold.partnerResidues || "";
    if (!colabfold.models || !colabfold.models.length) {
      return;
    }
    colabfold.models.forEach(function (model) {
      var row = document.createElement("div");
      var copy = document.createElement("span");
      var title = document.createElement("strong");
      var detail = document.createElement("small");
      var actions = document.createElement("div");
      var preview = document.createElement("button");
      row.className = "result-row" + (model.id === colabfold.selectedModelId ? " selected" : "");
      title.textContent = "ColabFold model " + model.rank + " - " + model.filename;
      detail.textContent = model.relativePath;
      preview.type = "button";
      preview.textContent = model.id === colabfold.selectedModelId ? "Previewing" : "Preview";
      preview.addEventListener("click", function () {
        previewColabfoldModel(model);
      });
      copy.appendChild(title);
      copy.appendChild(detail);
      actions.className = "result-actions";
      actions.appendChild(preview);
      row.appendChild(copy);
      row.appendChild(actions);
      refs.colabfoldModelList.appendChild(row);
    });
  }

  function currentDockedStructureModels() {
    var project = currentProject();
    var previewComplex = project.results && project.results.preview;
    if (!previewComplex && project.colabfold && project.colabfold.preview) {
      previewComplex = {
        filename: project.colabfold.preview.filename,
        pdbText: project.colabfold.preview.pdbText
      };
    }
    if (!previewComplex) {
      return [];
    }
    if (previewComplex.pdbText) {
      return [{
        label: previewComplex.filename || "Selected complex",
        pdbText: previewComplex.pdbText,
        kind: "complex"
      }];
    }
    return [fallbackPdbModel(previewComplex.filename || "Selected complex", previewComplex.atoms, "complex", "This imported result only has preview atoms.")];
  }

  function drawDockedStructure() {
    var models = currentDockedStructureModels();
    refs.dockEmptyView.textContent = models.length ? "" : "Preview a HADDOCK3 or ColabFold result";
    refs.dockEmptyView.style.display = models.length ? "none" : "grid";
    loadModelsIntoViewer({
      viewer: dockViewer,
      models: models,
      canvas: refs.dockCanvas,
      emptyView: refs.dockEmptyView,
      hoverReadout: refs.dockHoverReadout,
      resize: resizeDockViewer,
      unavailableText: "NGL viewer unavailable",
      errorText: "Unable to load docked structure"
    });
  }

  var analysisPlotDescriptors = [
    { stem: "complex-backbone-rmsd", id: "complex-rmsd", label: "Complex RMSD", xLabel: "Time", yLabel: "RMSD (nm)", order: 10 },
    { stem: "protein-ca-rmsf", id: "protein-rmsf", label: "Residue RMSF", xLabel: "Residue", yLabel: "RMSF (nm)", order: 20 },
    { stem: "protein-radius-gyration", id: "protein-gyration", label: "Radius of gyration", xLabel: "Time", yLabel: "Rg (nm)", order: 30 },
    { stem: "protein-periodic-image-mindist", id: "periodic-distance", label: "Periodic-image distance", xLabel: "Time", yLabel: "Distance (nm)", order: 40 },
    { stem: "interface-minimum-distance", id: "interface-distance", label: "Interface distance", xLabel: "Time", yLabel: "Distance (nm)", order: 50 },
    { stem: "interface-contact-count", id: "interface-contacts", label: "Interface contacts", xLabel: "Time", yLabel: "Contacts", order: 60 },
    { stem: "interface-hydrogen-bonds", id: "interface-hbonds", label: "Interface H-bonds", xLabel: "Time", yLabel: "Hydrogen bonds", order: 70 }
  ];

  function analysisVariantLabel(variant) {
    return variant.replace(/-/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function analysisPlotDefinition(filename) {
    var lower = String(filename || "").toLowerCase();
    if (!/\.xvg$/i.test(lower)) {
      return null;
    }
    var basename = lower.replace(/\.xvg$/i, "");
    for (var index = 0; index < analysisPlotDescriptors.length; index += 1) {
      var descriptor = analysisPlotDescriptors[index];
      if (basename === descriptor.stem || basename.indexOf(descriptor.stem + "-") === 0) {
        var variant = basename === descriptor.stem ? "" : basename.slice(descriptor.stem.length + 1);
        var variantLabel = variant ? analysisVariantLabel(variant) : "";
        return Object.assign({}, descriptor, {
          id: descriptor.id + (variant ? "-" + filenameSlug(variant) : ""),
          label: descriptor.label + (variantLabel ? " (" + variantLabel + ")" : ""),
          variant: variant,
          variantLabel: variantLabel,
          order: descriptor.order + (variant ? 1 : 0)
        });
      }
    }
    return null;
  }

  function readAnalysisDirectory(files) {
    var fileList = Array.from(files || []);
    var xvgFiles = fileList.filter(function (file) {
      return Boolean(analysisPlotDefinition(file.name));
    });
    var summaryFile = fileList.find(function (file) {
      return file.name.toUpperCase() === "ANALYSIS-SUMMARY.TXT";
    });
    var trajectoryFiles = fileList.filter(function (file) {
      return /^production.*\.xtc$/i.test(file.name);
    }).map(function (file) {
      return file.name;
    }).sort();
    var centeredTrajectory = trajectoryFiles.some(function (name) {
      return /centered|cluster|fit|protein-only|whole|nojump|mol-compact/i.test(name);
    });
    var movieTrajectory = trajectoryFiles.find(function (name) {
      return /protein-only.*\.xtc$/i.test(name);
    }) || "";
    Promise.all(xvgFiles.map(function (file) {
      return file.text().then(function (text) {
        return parseXvg(text, file.name);
      });
    }).concat(summaryFile ? [summaryFile.text()] : [Promise.resolve("")])).then(function (values) {
      var plots = values.slice(0, xvgFiles.length).reduce(function (items, value) {
        return items.concat(Array.isArray(value) ? value : [value]);
      }, []).filter(function (plot) {
        return plot.points.length;
      }).sort(function (left, right) {
        return (left.order - right.order) || left.label.localeCompare(right.label);
      });
      var project = currentProject();
      project.analysis = {
        importedAt: new Date().toISOString(),
        sourceFolder: fileList[0] ? String(fileList[0].webkitRelativePath || "").split("/")[0] || "analysis" : "analysis",
        summary: values[values.length - 1],
        centeredTrajectory: centeredTrajectory,
        movieTrajectory: movieTrajectory,
        trajectoryFiles: trajectoryFiles,
        plots: plots,
        selectedPlotId: plots[0] ? plots[0].id : null
      };
      touchProject();
      renderAnalysis();
    });
  }

  function parseXvg(text, filename) {
    var definition = analysisPlotDefinition(filename) || {
      id: filenameSlug(filename),
      label: filename,
      xLabel: "X",
      yLabel: "Y",
      order: 999
    };
    var title = definition.label;
    var xLabel = definition.xLabel;
    var yLabel = definition.yLabel;
    var points = [];
    text.split(/\r?\n/).forEach(function (line) {
      var titleMatch = line.match(/^@\s+title\s+"(.+)"/i);
      var xLabelMatch = line.match(/^@\s+xaxis\s+label\s+"(.+)"/i);
      var yLabelMatch = line.match(/^@\s+yaxis\s+label\s+"(.+)"/i);
      if (titleMatch) {
        title = titleMatch[1];
      }
      if (xLabelMatch) {
        xLabel = xLabelMatch[1];
      }
      if (yLabelMatch) {
        yLabel = yLabelMatch[1];
      }
      if (/^\s*[@#]/.test(line) || !line.trim()) {
        return;
      }
      var columns = line.trim().split(/\s+/).map(Number);
      if (columns.length >= 2 && Number.isFinite(columns[0]) && Number.isFinite(columns[1])) {
        points.push({ x: columns[0], y: columns[1] });
      }
    });
    if (definition.id.indexOf("protein-rmsf") === 0 && rmsfNeedsChainSplit(points)) {
      return splitRmsfByChain(points, definition, filename, title, xLabel, yLabel);
    }
    return buildAnalysisPlot(definition, filename, title, xLabel, yLabel, points);
  }

  function rmsfNeedsChainSplit(points) {
    for (var index = 1; index < points.length; index += 1) {
      if (points[index].x <= points[index - 1].x) {
        return true;
      }
    }
    return false;
  }

  function splitRmsfByChain(points, definition, filename, title, xLabel, yLabel) {
    var chains = [];
    var current = [];
    points.forEach(function (point) {
      if (current.length && point.x <= current[current.length - 1].x) {
        chains.push(current);
        current = [];
      }
      current.push(point);
    });
    if (current.length) {
      chains.push(current);
    }
    return chains.map(function (chainPoints, index) {
      var chainLabel = "Chain " + (index + 1);
      var chainDefinition = Object.assign({}, definition, {
        id: definition.id + "-chain-" + (index + 1),
        label: definition.label + " - " + chainLabel,
        order: definition.order + index / 100
      });
      return buildAnalysisPlot(
        chainDefinition,
        filename,
        title + " (" + chainLabel + ")",
        xLabel,
        yLabel,
        chainPoints
      );
    });
  }

  function buildAnalysisPlot(definition, filename, title, xLabel, yLabel, points) {
    var sampledPoints = downsamplePoints(points, 900);
    if (definition.variantLabel && title.indexOf(definition.variantLabel) === -1) {
      title += " (" + definition.variantLabel + ")";
    }
    return {
      id: definition.id,
      filename: filename,
      label: definition.label,
      title: title,
      xLabel: xLabel,
      yLabel: yLabel,
      order: definition.order,
      variantLabel: definition.variantLabel || "",
      pointCount: points.length,
      points: sampledPoints,
      stats: pointStats(points)
    };
  }

  function downsamplePoints(points, limit) {
    if (points.length <= limit) {
      return points;
    }
    var sampled = [];
    var step = (points.length - 1) / (limit - 1);
    for (var index = 0; index < limit; index += 1) {
      sampled.push(points[Math.round(index * step)]);
    }
    return sampled;
  }

  function pointStats(points) {
    if (!points.length) {
      return null;
    }
    var sum = 0;
    var minimum = points[0].y;
    var maximum = points[0].y;
    points.forEach(function (point) {
      sum += point.y;
      minimum = Math.min(minimum, point.y);
      maximum = Math.max(maximum, point.y);
    });
    return {
      first: points[0].y,
      last: points[points.length - 1].y,
      mean: sum / points.length,
      min: minimum,
      max: maximum
    };
  }

  function preferredAnalysisPlot(analysis, idPrefix) {
    var matches = analysis.plots.filter(function (plot) {
      return plot.id === idPrefix || plot.id.indexOf(idPrefix + "-") === 0;
    });
    return matches.find(function (plot) {
      return /cluster-fit/i.test(plot.filename);
    }) || matches.find(function (plot) {
      return /protein-only|clean|whole-centered|nojump|mol-compact/i.test(plot.filename);
    }) || matches[0] || null;
  }

  function analysisTrend(plot) {
    if (!plot || !plot.points.length) {
      return null;
    }
    var first = Number.isFinite(plot.stats.first) ? plot.stats.first : plot.points[0].y;
    var last = plot.stats.last;
    return {
      first: first,
      last: last,
      delta: last - first,
      ratio: Math.abs(first) > 0.0001 ? (last - first) / Math.abs(first) : 0
    };
  }

  function analysisRecentMean(plot, fraction) {
    if (!plot || !plot.points.length) {
      return null;
    }
    var start = Math.max(0, Math.floor(plot.points.length * (1 - fraction)));
    var recent = plot.points.slice(start);
    var sum = recent.reduce(function (total, point) {
      return total + point.y;
    }, 0);
    return recent.length ? sum / recent.length : null;
  }

  function buildAnalysisInterpretation(analysis) {
    if (!analysis.plots.length) {
      return null;
    }
    var rmsd = preferredAnalysisPlot(analysis, "complex-rmsd");
    var rg = preferredAnalysisPlot(analysis, "protein-gyration");
    var distance = preferredAnalysisPlot(analysis, "interface-distance");
    var contacts = preferredAnalysisPlot(analysis, "interface-contacts");
    var hbonds = preferredAnalysisPlot(analysis, "interface-hbonds");
    var rawRmsd = analysis.plots.find(function (plot) {
      return plot.id === "complex-rmsd";
    });
    var cleanedUsed = [rmsd, rg, distance, contacts, hbonds].some(function (plot) {
      return plot && /cluster-fit|protein-only|clean|whole-centered|nojump|mol-compact/i.test(plot.filename);
    });
    var good = 0;
    var caution = 0;
    var lowPriorityMarkers = [];
    var notes = [];
    var rmsdTrend = analysisTrend(rmsd);
    var rgTrend = analysisTrend(rg);
    var contactRecentMean = analysisRecentMean(contacts, 0.2);

    if (cleanedUsed) {
      notes.push("Using cleaned/PBC-processed plots where available.");
    }
    if (rawRmsd && rmsd && rawRmsd !== rmsd && rawRmsd.stats.max > Math.max(1.5, rmsd.stats.max * 3)) {
      notes.push("Raw RMSD looks affected by periodic-boundary imaging; cleaned RMSD is the better stability read.");
    }
    if (rmsd) {
      if (rmsd.stats.max < 0.8 && rmsd.stats.last < 0.7) {
        good += 1;
        notes.push("RMSD relaxes but remains bounded, consistent with a stable short MD candidate.");
      } else if (rmsd.stats.max > 1.5 || rmsd.stats.last > 1.0) {
        caution += 1;
        lowPriorityMarkers.push("Complex RMSD is high, so the pose may be rearranging, separating, or still affected by imaging.");
        notes.push("RMSD is high; inspect the trajectory for separation, unfolding, or remaining imaging artifacts.");
      } else {
        notes.push("RMSD is moderate; compare against interface metrics before judging the pose.");
      }
    }
    if (distance) {
      if (distance.stats.max < 0.8 && distance.stats.mean < 0.5) {
        good += 1;
        notes.push("Interface minimum distance stays low, so the partners remain in close contact.");
      } else if (distance.stats.last > 1.0 || distance.stats.max > 1.5) {
        caution += 1;
        lowPriorityMarkers.push("Interface distance grows, which can mean the partners are drifting apart.");
        notes.push("Interface distance increases substantially, which can indicate partner separation.");
      }
    }
    if (contacts) {
      if (contacts.stats.last > 50 && contacts.stats.mean > 50) {
        good += 1;
        notes.push("Interface contacts remain strongly nonzero after relaxation.");
      } else if (contacts.stats.last <= 10 || contacts.stats.min <= 0) {
        caution += 1;
        lowPriorityMarkers.push("Interface contacts collapse to near zero during the trajectory.");
        notes.push("Interface contacts approach zero, which is a warning sign for dissociation.");
      } else if (contactRecentMean !== null && contactRecentMean < contacts.stats.mean * 0.35) {
        caution += 1;
        lowPriorityMarkers.push("Late-trajectory interface contacts are much lower than the run average.");
        notes.push("Interface contacts approach zero, which is a warning sign for dissociation.");
      }
    }
    if (rg && rgTrend) {
      if (Math.abs(rgTrend.ratio) < 0.12 && rg.stats.max < rg.stats.mean * 1.25) {
        good += 1;
        notes.push("Radius of gyration stays compact without a runaway expansion.");
      } else if (rgTrend.ratio > 0.2 || rg.stats.max > rg.stats.mean * 1.4) {
        caution += 1;
        lowPriorityMarkers.push("Radius of gyration expands noticeably, suggesting unfolding, swelling, or unresolved trajectory artifacts.");
        notes.push("Radius of gyration expands noticeably; inspect for unfolding or imaging problems.");
      }
    }
    if (hbonds) {
      if (hbonds.stats.mean > 0.5) {
        notes.push("Hydrogen bonds are present on average, but treat them as supportive because they are naturally noisy.");
      } else {
        if (hbonds.stats.max <= 1 && hbonds.stats.mean < 0.2) {
          lowPriorityMarkers.push("Interface hydrogen bonding is essentially absent; this is supportive evidence only.");
        }
        notes.push("Hydrogen bonds are sparse; contacts and distance are more important for this screen.");
      }
    }
    var hasInterfaceFailure = contacts && distance &&
      (contacts.stats.last <= 10 || (contactRecentMean !== null && contactRecentMean < contacts.stats.mean * 0.35)) &&
      (distance.stats.last > 1.0 || distance.stats.max > 1.5);
    var likelyLowPriority = lowPriorityMarkers.length >= 3 || hasInterfaceFailure;
    if (likelyLowPriority) {
      notes.unshift("Probably not worth chasing marker: multiple stability/interface signals point away from a persistent complex.");
      lowPriorityMarkers.forEach(function (marker) {
        notes.push("Marker: " + marker);
      });
    }
    var status = likelyLowPriority ? "Low-priority interaction signal" :
      caution ? "Needs inspection" : good >= 3 ? "Stable candidate interaction" : "Inconclusive";
    var caveat = likelyLowPriority ?
      "This is a triage warning, not a final biological conclusion; consider repeat runs or another starting pose before dropping an important target." :
      "This supports follow-up screening, but short MD does not prove biological binding.";
    return {
      status: status,
      tone: likelyLowPriority ? "deprioritize" : caution ? "caution" : good >= 3 ? "good" : "neutral",
      notes: notes,
      caveat: caveat
    };
  }

  function renderAnalysisInterpretation(analysis) {
    refs.analysisInterpretation.innerHTML = "";
    var interpretation = buildAnalysisInterpretation(analysis);
    if (!interpretation) {
      refs.analysisInterpretation.hidden = true;
      return;
    }
    refs.analysisInterpretation.hidden = false;
    refs.analysisInterpretation.className = "analysis-interpretation " + interpretation.tone;
    var heading = document.createElement("strong");
    var list = document.createElement("ul");
    var caveat = document.createElement("p");
    heading.textContent = interpretation.status;
    interpretation.notes.forEach(function (note) {
      var item = document.createElement("li");
      item.textContent = note;
      list.appendChild(item);
    });
    caveat.textContent = interpretation.caveat;
    refs.analysisInterpretation.appendChild(heading);
    refs.analysisInterpretation.appendChild(list);
    refs.analysisInterpretation.appendChild(caveat);
  }

  function renderAnalysisFileGuide(analysis) {
    refs.analysisFileGuide.innerHTML = "";
    var hasPlots = analysis.plots && analysis.plots.length;
    var trajectories = analysis.trajectoryFiles || [];
    var hasMovie = Boolean(analysis.movieTrajectory);
    var hasIntermediate = trajectories.some(function (name) {
      return /whole|nojump|centered/i.test(name);
    });
    if (!hasPlots && !trajectories.length) {
      refs.analysisFileGuide.hidden = true;
      return;
    }
    refs.analysisFileGuide.hidden = false;
    [
      {
        title: hasMovie ? "Trusted movie files" : "Expected movie files",
        text: hasMovie ? "Use this pair for smooth viewing." : "Rerun the updated analysis export to create the smooth movie pair.",
        ready: hasMovie,
        files: ["analysis/production-protein-only.gro", "analysis/production-protein-only.xtc"]
      },
      {
        title: "Raw archive",
        text: "Keep the full-system production output as the original simulation record.",
        ready: true,
        files: ["outputs/production.xtc"]
      },
      {
        title: hasIntermediate ? "Cleanup intermediates" : "Cleanup pipeline",
        text: hasIntermediate ? "These help build the final movie and can be removed after checking it." : "Wineinger NHG creates these before the fitted protein-only movie.",
        ready: hasIntermediate,
        files: ["analysis/production-whole.xtc", "analysis/production-nojump.xtc", "analysis/production-centered.xtc"]
      }
    ].forEach(function (role) {
      var card = document.createElement("div");
      var heading = document.createElement("h3");
      var text = document.createElement("p");
      card.className = "file-role" + (role.ready ? " ready" : "");
      heading.textContent = role.title;
      text.textContent = role.text;
      card.appendChild(heading);
      card.appendChild(text);
      role.files.forEach(function (file) {
        var code = document.createElement("code");
        code.textContent = file;
        card.appendChild(code);
      });
      refs.analysisFileGuide.appendChild(card);
    });
  }

  function renderAnalysis() {
    var analysis = currentProject().analysis || defaultAnalysis();
    var plot = analysis.plots.find(function (item) {
      return item.id === analysis.selectedPlotId;
    }) || analysis.plots[0];
    refs.analysisTabs.innerHTML = "";
    refs.analysisMetrics.innerHTML = "";
    refs.analysisSummary.textContent = analysis.summary || "No summary imported.";
    renderAnalysisInterpretation(analysis);
    renderAnalysisFileGuide(analysis);
    if (!plot) {
      refs.analysisStatus.innerHTML = "Import the copied Argon <code>analysis</code> folder to review GROMACS trajectory metrics.";
      refs.analysisChartTitle.textContent = "No analysis loaded";
      refs.analysisChartDetail.textContent = "Import an analysis folder to display trajectory plots.";
      refs.analysisPointCount.textContent = "0 points";
      drawAnalysisPlot(null);
      return;
    }
    refs.analysisStatus.textContent = analysis.plots.length + " plots imported" +
      (analysis.movieTrajectory ? " - protein-only movie found." :
        analysis.centeredTrajectory ? " - cleaned trajectory found." :
          analysis.trajectoryFiles && analysis.trajectoryFiles.length ? " - trajectory file found." : ".");
    analysis.plots.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "analysis-tab" + (item.id === plot.id ? " active" : "");
      button.textContent = item.label;
      button.addEventListener("click", function () {
        currentProject().analysis.selectedPlotId = item.id;
        touchProject();
        renderAnalysis();
      });
      refs.analysisTabs.appendChild(button);
    });
    ["last", "mean", "min", "max"].forEach(function (key) {
      var metric = document.createElement("div");
      var label = document.createElement("span");
      var value = document.createElement("strong");
      metric.className = "analysis-metric";
      label.textContent = key === "last" ? "Final value" : key === "mean" ? "Mean" : key === "min" ? "Minimum" : "Maximum";
      value.textContent = formatAnalysisNumber(plot.stats[key]);
      metric.appendChild(label);
      metric.appendChild(value);
      refs.analysisMetrics.appendChild(metric);
    });
    refs.analysisChartTitle.textContent = plot.title;
    refs.analysisChartDetail.textContent = plot.xLabel + " vs " + plot.yLabel + " - " + plot.filename;
    refs.analysisPointCount.textContent = plot.pointCount + " points";
    drawAnalysisPlot(plot);
  }

  function formatAnalysisNumber(value) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function drawAnalysisPlot(plot) {
    var canvas = refs.analysisCanvas;
    var bounds = canvas.getBoundingClientRect();
    var width = Math.max(bounds.width, 260);
    var height = Math.max(bounds.height, 170);
    var ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    var ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fbfa";
    ctx.fillRect(0, 0, width, height);
    if (!plot || !plot.points.length) {
      return;
    }
    var padding = { left: 48, right: 15, top: 12, bottom: 32 };
    var xMin = plot.points[0].x;
    var xMax = plot.points[plot.points.length - 1].x;
    var yMin = plot.stats.min;
    var yMax = plot.stats.max;
    if (xMin === xMax) {
      xMax += 1;
    }
    if (yMin === yMax) {
      yMin -= 0.5;
      yMax += 0.5;
    }
    function plotX(value) {
      return padding.left + (value - xMin) / (xMax - xMin) * (width - padding.left - padding.right);
    }
    function plotY(value) {
      return height - padding.bottom - (value - yMin) / (yMax - yMin) * (height - padding.top - padding.bottom);
    }
    ctx.strokeStyle = "#d4dddb";
    ctx.fillStyle = "#627270";
    ctx.font = "10px Segoe UI";
    ctx.lineWidth = 1;
    for (var tick = 0; tick <= 4; tick += 1) {
      var y = padding.top + tick * (height - padding.top - padding.bottom) / 4;
      var value = yMax - tick * (yMax - yMin) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatAnalysisNumber(value), 4, y + 3);
    }
    ctx.strokeStyle = "#087f71";
    ctx.lineWidth = 2;
    ctx.beginPath();
    plot.points.forEach(function (point, index) {
      if (index === 0) {
        ctx.moveTo(plotX(point.x), plotY(point.y));
      } else {
        ctx.lineTo(plotX(point.x), plotY(point.y));
      }
    });
    ctx.stroke();
    ctx.fillStyle = "#627270";
    ctx.fillText(formatAnalysisNumber(xMin), padding.left, height - 10);
    ctx.fillText(formatAnalysisNumber(xMax), width - padding.right - 30, height - 10);
  }

  function readStructureFile(file, type) {
    if (!file) {
      return;
    }
    file.text().then(function (text) {
      var project = currentProject();
      if (type === "receptor") {
        var atoms = parsePdb(text);
        var metadata = parsePdbMetadata(text, file.name);
        clearStructurePreview(project);
        addProteinComponent({
          id: uid(),
          label: file.name,
          source: "local",
          sourceId: null,
          pdbText: text,
          atoms: atoms,
          metadata: metadata,
          visible: true
        });
      } else {
        var molecule = parseSdf(text);
        project.assets.ligand = { name: file.name, atoms: molecule.atoms, bonds: molecule.bonds };
      }
      project.status = "Configured";
      touchProject();
      renderAssets();
      refs.projectStatus.textContent = project.status;
    });
  }

  function pdbLineFromAtom(atom, index) {
    var serial = String(index + 1).padStart(5, " ");
    var element = String(atom.element || "C").slice(0, 2).toUpperCase();
    var name = element.length === 1 ? " " + element + "  " : " " + element + " ";
    var chain = String(atom.chain || "A").slice(0, 1) || "A";
    return "ATOM  " + serial + " " + name + "GLY " + chain + String(index + 1).padStart(4, " ") + "    " +
      atom.x.toFixed(3).padStart(8, " ") +
      atom.y.toFixed(3).padStart(8, " ") +
      atom.z.toFixed(3).padStart(8, " ") +
      "  1.00 20.00           " + element.padStart(2, " ");
  }

  function pdbFromAtoms(atoms) {
    return (atoms || []).map(pdbLineFromAtom).concat("END").join("\n");
  }

  function pdbForChains(text, chains) {
    if (!text) {
      return "";
    }
    var keep = {};
    (chains || []).forEach(function (chain) {
      keep[chain] = true;
    });
    return text.split(/\r?\n/).filter(function (line) {
      if (/^ATOM  |^HETATM/.test(line)) {
        var chain = line.slice(21, 22).trim();
        return !chains || !chains.length || !chain || keep[chain];
      }
      return /^MODEL|^ENDMDL|^TER/.test(line);
    }).concat("END").join("\n");
  }

  function rcsbPdbId(component) {
    var sourceId = String(component && component.sourceId || "").toUpperCase();
    return /^[0-9A-Z]{4}$/.test(sourceId) && component.source === "rcsb" ? sourceId : "";
  }

  function requestMissingPdbText(project, component) {
    var pdbId = rcsbPdbId(component);
    var key = project.id + ":" + component.id;
    if (!pdbId || component.pdbText || pdbTextFetches[key] || pdbTextFetchFailures[key] || !window.ezDesktop || !window.ezDesktop.fetchPdb) {
      return false;
    }
    pdbTextFetches[key] = true;
    window.ezDesktop.fetchPdb(pdbId).then(function (result) {
      var targetProject = projectById(project.id);
      var targetComponent = targetProject && targetProject.system.components.find(function (item) {
        return item.id === component.id;
      });
      if (!targetComponent) {
        return;
      }
      targetComponent.pdbText = result.text;
      targetComponent.sourceUrl = result.url || targetComponent.sourceUrl;
      targetComponent.atoms = parsePdb(result.text);
      targetComponent.metadata = parsePdbMetadata(result.text, result.pdbId || pdbId);
      normalizeComponentChains(targetComponent);
      targetProject.modified = new Date().toISOString();
      saveState();
      if (targetProject.id === state.currentProjectId) {
        renderProjects();
        renderComponents();
        renderInteraction();
        drawStructure();
      }
    }).catch(function () {
      pdbTextFetchFailures[key] = true;
      if (project.id === state.currentProjectId) {
        drawStructure();
      }
    }).finally(function () {
      delete pdbTextFetches[key];
    });
    return true;
  }

  function isMissingPdbTextLoading(project, component) {
    return Boolean(pdbTextFetches[project.id + ":" + component.id]);
  }

  function fallbackPdbModel(label, atoms, kind, reason) {
    return {
      label: label,
      pdbText: pdbFromAtoms(atoms),
      kind: kind,
      fallback: true,
      fallbackReason: reason
    };
  }

  function currentStructureModels() {
    var project = currentProject();
    var previewComplex = project.results && project.results.preview;
    if (!renderState.receptorVisible) {
      return [];
    }
    function componentModels(onlyComponentId) {
      return project.system.components.filter(function (component) {
        return component.visible !== false;
      }).filter(function (component) {
        return !onlyComponentId || component.id === onlyComponentId;
      }).map(function (component) {
        var retained = retainedComponentChains(component);
        var atoms = (component.atoms || []).filter(function (atom) {
          return !atom.chain || retained.indexOf(atom.chain) !== -1;
        });
        if (component.pdbText) {
          return {
            label: component.label,
            pdbText: pdbForChains(component.pdbText, retained),
            kind: "component"
          };
        }
        return fallbackPdbModel(
          component.label,
          atoms,
          "component",
          isMissingPdbTextLoading(project, component) || requestMissingPdbText(project, component) ?
            "Loading the full PDB records from RCSB so cartoon, licorice, and surface styles can render correctly." :
            "This saved component only has preview atoms. Reimport the original PDB file to enable full NGL styles."
        );
      }).filter(function (model) {
        return /^(ATOM  |HETATM)/m.test(model.pdbText);
      });
    }
    if (project.viewer && project.viewer.componentId) {
      var selectedModels = componentModels(project.viewer.componentId);
      if (selectedModels.length) {
        return selectedModels;
      }
    }
    if (previewComplex) {
      if (!previewComplex.pdbText) {
        var fullComponents = componentModels().filter(function (model) {
          return !model.fallback;
        });
        if (fullComponents.length) {
          return fullComponents;
        }
        return [fallbackPdbModel(previewComplex.filename || "Selected complex", previewComplex.atoms, "complex", "The imported result only has preview atoms. Reimport the selected PDB result to enable full NGL styles.")];
      }
      return [{
        label: previewComplex.filename || "Selected complex",
        pdbText: previewComplex.pdbText,
        kind: "complex"
      }];
    }
    return componentModels();
  }

  function ensureNglStage(viewer, canvas, hoverReadout) {
    if (!window.NGL || !canvas) {
      return null;
    }
    if (!viewer.stage) {
      viewer.stage = new window.NGL.Stage(canvas, {
        backgroundColor: "white",
        clipNear: 0,
        clipFar: 100,
        clipDist: 0,
        fogNear: 100,
        fogFar: 100
      });
      viewer.stage.setParameters({
        cameraType: "perspective",
        impostor: true,
        sampleLevel: 1,
        tooltip: false
      });
      canvas.__nglStage = viewer.stage;
      installNglHoverReadout(viewer, canvas, hoverReadout);
    }
    return viewer.stage;
  }

  function pickingLabel(pickingProxy) {
    if (!pickingProxy) {
      return "";
    }
    if (typeof pickingProxy.getLabel === "function") {
      return pickingProxy.getLabel();
    }
    if (pickingProxy.atom) {
      var atom = pickingProxy.atom;
      return "atom: " + [
        atom.resname,
        atom.resno,
        atom.chainname ? "chain " + atom.chainname : "",
        atom.atomname
      ].filter(Boolean).join(" ");
    }
    if (pickingProxy.bond && pickingProxy.bond.atom1 && pickingProxy.bond.atom2) {
      return "bond: " + pickingLabel({ atom: pickingProxy.bond.atom1 }) + " - " + pickingLabel({ atom: pickingProxy.bond.atom2 });
    }
    return "";
  }

  function installNglHoverReadout(viewer, canvas, hoverReadout) {
    if (!viewer.stage || viewer.hoverInstalled || !viewer.stage.signals || !viewer.stage.signals.hovered) {
      return;
    }
    viewer.hoverInstalled = true;
    viewer.stage.signals.hovered.add(function (pickingProxy) {
      var label = pickingLabel(pickingProxy);
      hoverReadout.textContent = label;
      hoverReadout.style.display = label ? "flex" : "none";
    });
    canvas.addEventListener("mouseleave", function () {
      hoverReadout.textContent = "";
      hoverReadout.style.display = "none";
    });
  }

  function resizeStructureViewer() {
    resizeNglViewer(structureViewer);
  }

  function resizeDockViewer() {
    resizeNglViewer(dockViewer);
  }

  function resizeNglViewer(viewer) {
    if (!viewer.stage) {
      return;
    }
    viewer.stage.handleResize();
    window.requestAnimationFrame(function () {
      if (viewer.stage) {
        viewer.stage.handleResize();
      }
    });
    window.setTimeout(function () {
      if (viewer.stage) {
        viewer.stage.handleResize();
      }
    }, 120);
  }

  function nglColorScheme(model) {
    if (viewerSettings.color === "chain") {
      return model.kind === "complex" ? "chainindex" : "chainname";
    }
    if (viewerSettings.color === "uniform") {
      return "uniform";
    }
    return viewerSettings.color;
  }

  function addNglRepresentations(component, model) {
    var color = nglColorScheme(model);
    var params = {
      sele: "protein",
      color: color,
      quality: viewerSettings.quality
    };
    if (viewerSettings.color === "uniform") {
      params.colorValue = "#087f71";
    }
    if (viewerSettings.style === "surface") {
      component.addRepresentation("surface", Object.assign({}, params, {
        opacity: 0.72,
        surfaceType: "av"
      }));
    } else if (viewerSettings.style === "ball+stick") {
      component.addRepresentation("ball+stick", Object.assign({}, params, {
        radiusScale: 0.7,
        multipleBond: "symmetric"
      }));
    } else if (viewerSettings.style === "licorice") {
      component.addRepresentation("licorice", Object.assign({}, params, {
        radius: 0.22
      }));
    } else if (viewerSettings.style === "backbone") {
      component.addRepresentation("backbone", Object.assign({}, params, {
        radius: 0.25
      }));
    } else {
      component.addRepresentation("cartoon", Object.assign({}, params, {
        aspectRatio: 4
      }));
    }
    component.addRepresentation("base", {
      sele: "nucleic",
      color: color,
      quality: viewerSettings.quality
    });
    if (viewerSettings.showHetero) {
      component.addRepresentation("licorice", {
        sele: "not protein and not nucleic and not water",
        color: "element",
        radius: 0.22,
        quality: viewerSettings.quality
      });
    }
  }

  function loadModelsIntoViewer(options) {
    var viewer = options.viewer;
    var models = options.models;
    var stage = ensureNglStage(viewer, options.canvas, options.hoverReadout);
    if (!stage) {
      options.emptyView.textContent = options.unavailableText || "NGL viewer unavailable";
      options.emptyView.style.display = "grid";
      return;
    }
    var signature = models.map(function (model) {
      return model.label + ":" + model.pdbText.length + ":" + model.pdbText.slice(0, 80) + ":" + model.pdbText.slice(-80) + ":fallback:" + Boolean(model.fallback);
    }).join("|") + "|style:" + viewerSettings.style + "|color:" + viewerSettings.color + "|quality:" + viewerSettings.quality + "|hetero:" + viewerSettings.showHetero;
    if (signature === viewer.signature) {
      options.resize();
      return;
    }
    viewer.signature = signature;
    viewer.loadId += 1;
    var loadId = viewer.loadId;
    stage.removeAllComponents();
    options.hoverReadout.textContent = "";
    options.hoverReadout.style.display = "none";
    if (!models.length) {
      return;
    }
    Promise.all(models.map(function (model) {
      var blob = new Blob([model.pdbText], { type: "text/plain" });
      return stage.loadFile(blob, { ext: "pdb", name: model.label, defaultRepresentation: false }).then(function (component) {
        if (loadId !== viewer.loadId) {
          return null;
        }
        addNglRepresentations(component, model);
        return component;
      });
    })).then(function () {
      if (loadId === viewer.loadId) {
        stage.autoView();
        options.resize();
      }
    }).catch(function () {
      if (loadId === viewer.loadId) {
        options.emptyView.textContent = options.errorText || "Unable to load structure";
        options.emptyView.style.display = "grid";
      }
    });
  }

  function drawStructure() {
    var models = currentStructureModels();
    var fallbackModel = models.find(function (model) { return model.fallback; });
    refs.emptyView.textContent = "No structure loaded";
    refs.emptyView.style.display = models.length ? "none" : "grid";
    refs.viewerNote.textContent = fallbackModel ? fallbackModel.fallbackReason : "";
    refs.viewerNote.style.display = fallbackModel ? "block" : "none";
    loadModelsIntoViewer({
      viewer: structureViewer,
      models: models,
      canvas: refs.canvas,
      emptyView: refs.emptyView,
      hoverReadout: refs.viewerHoverReadout,
      resize: resizeStructureViewer,
      unavailableText: "NGL viewer unavailable",
      errorText: "Unable to load structure"
    });
  }

  function runManifest(project) {
    return {
      schemaVersion: "0.1",
      project: { id: project.id, name: project.name },
      input: {
        receptor: project.assets.receptor ? project.assets.receptor.name : null,
        ligand: project.assets.ligand ? project.assets.ligand.name : null,
        smiles: project.assets.smiles || null,
        systemComponents: project.system.components.map(function (component) {
          return {
            label: component.label,
            source: component.source,
            sourceId: component.sourceId,
            sourceUrl: component.sourceUrl || null,
            retainedChains: retainedComponentChains(component),
            metadata: component.metadata
          };
        })
      },
      workflow: {
        preset: project.workflow.preset,
        steps: project.workflow.steps.filter(function (step) { return step.enabled; }).map(function (step) {
          return { id: step.id, engine: step.engine };
        }),
        settings: project.workflow.settings
      },
      interaction: {
        enabled: true,
        receptorComponentId: project.interaction.receptorId,
        partnerComponentId: project.interaction.partnerId,
        receptorChain: project.interaction.receptorChain,
        partnerChain: project.interaction.partnerChain,
        method: project.interaction.method,
        guidance: project.interaction.method === "haddock3" ? project.interaction.guidance : null,
        receptorRestraints: project.interaction.method === "haddock3" ? project.interaction.receptorRestraints : "",
        partnerRestraints: project.interaction.method === "haddock3" ? project.interaction.partnerRestraints : "",
        status: project.interaction.status,
        note: interactionSummary(project.interaction),
        argonExportReady: Boolean(canExportHaddock(project)),
        executionProfile: canExportHaddock(project) ? {
          scheduler: "sge",
          accelerator: "cpu",
          cpus: Number(project.execution.cpus || 8),
          walltime: project.execution.walltime || "24:00:00",
          artifacts: ["haddock3.cfg", "stage-haddock-inputs.sh", "haddock3.sge.job", "submit-haddock-campaign.sh", "ARGON-HADDOCK3-INSTRUCTIONS.txt", "LOCAL-COLABFOLD-SEQUENCES.txt", colabfoldName(project) + ".fasta"].concat(haddockUsesAmbiguousRestraints(project) ? ["receptor.actpass", "partner.actpass"] : [])
        } : null
      },
      workspace: {
        localPath: project.workspace.localPath,
        remotePath: project.workspace.remotePath,
        host: project.workspace.host,
        port: project.workspace.port,
        syncMethod: project.workspace.method || "rsync"
      },
      results: {
        sourceFolder: project.results.sourceFolder,
        importedAt: project.results.importedAt,
        candidateCount: project.results.candidates.length,
        selectedComplex: project.results.selectedComplex ? {
          filename: project.results.selectedComplex.filename,
          relativePath: project.results.selectedComplex.relativePath,
          rank: project.results.selectedComplex.rank,
          score: project.results.selectedComplex.score,
          nextStage: "gromacs-preparation"
        } : null,
        gromacsPreparation: project.results.selectedComplex ? project.results.preparation : null
      },
      colabfold: {
        importedAt: project.colabfold.importedAt,
        modelCount: project.colabfold.modelCount,
        modelsWithContacts: project.colabfold.modelsWithContacts,
        receptorResidues: project.colabfold.receptorResidues,
        partnerResidues: project.colabfold.partnerResidues,
        role: "optional evidence alongside the HADDOCK3 5-2-1 campaign"
      },
      analysis: {
        importedAt: project.analysis.importedAt,
        sourceFolder: project.analysis.sourceFolder,
        plotCount: project.analysis.plots.length,
        centeredTrajectory: project.analysis.centeredTrajectory,
        movieTrajectory: project.analysis.movieTrajectory
      },
      execution: {
        target: project.execution.enabled ? "remote-cluster" : "planning-only",
        cluster: project.execution.enabled ? {
          name: project.execution.clusterName,
          sshHost: project.execution.sshHost || null,
          sshPort: project.execution.sshPort,
          scheduler: project.execution.scheduler,
          queue: project.execution.queue || null,
          prerequisiteModule: project.execution.prerequisiteModule || null,
          module: project.execution.module,
          command: project.execution.command,
          engineVersion: project.execution.engineVersion,
          acceleration: project.execution.acceleration,
          gpuSupport: project.execution.gpuSupport,
          walltime: project.execution.walltime,
          cpus: project.execution.cpus,
          gpus: project.execution.gpu ? 1 : 0
        } : null,
        status: project.execution.enabled ? "awaiting-prepared-tpr-and-submission" : "awaiting-engine-connectors",
        requiredConnectors: Array.from(new Set(project.workflow.steps.filter(function (step) {
          return step.enabled;
        }).map(function (step) {
          return step.engine;
        }))),
        inputContract: project.execution.enabled ? "Stage prepared inputs/production.tpr before submitting the SGE job script." : null
      },
      generatedAt: new Date().toISOString()
    };
  }

  function exportManifest() {
    var project = currentProject();
    var payload = JSON.stringify(runManifest(project), null, 2);
    downloadText(projectSlug(project) + "-manifest.json", payload, "application/json");
  }

  function projectSlug(project) {
    return slugText(project.name);
  }

  function filenameSlug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function downloadText(filename, contents, mimeType) {
    var blob = new Blob([contents], { type: mimeType || "text/plain" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function shellValue(value) {
    return String(value || "").replace(/[^A-Za-z0-9_.:/-]/g, "_");
  }

  function haddockInputFilename(component, role) {
    var sourceId = component && component.sourceId ? component.sourceId.toLowerCase() : role;
    return sourceId.replace(/[^a-z0-9_-]/g, "_") + "-" + role + ".pdb";
  }

  function colabfoldName(project) {
    return (projectSlug(project) || haddockFolderName(project) || "wineinger-nhg") + "-colabfold";
  }

  function normalizedProteinSequence(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  }

  function validProteinSequence(sequence) {
    return /^[ACDEFGHIKLMNPQRSTVWYBXZJUO]+$/.test(sequence || "");
  }

  function customProteinSlug(project) {
    var name = project && project.proteinBuilder && project.proteinBuilder.name || "custom-protein";
    return slugText(name) || "custom-protein";
  }

  function customProteinFolderName(project) {
    return (projectSlug(project) || "wineinger-nhg") + "-" + customProteinSlug(project) + "-colabfold";
  }

  function customProteinFastaName(project) {
    return customProteinFolderName(project) + ".fasta";
  }

  function canExportCustomProtein(project) {
    var builder = project.proteinBuilder || defaultProteinBuilder();
    var sequence = normalizedProteinSequence(builder.sequence);
    return Boolean((builder.name || "").trim()) && sequence.length > 0 && validProteinSequence(sequence);
  }

  function colabfoldFasta(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorSequence = sequenceFromPdbChain(receptor && receptor.pdbText, project.interaction.receptorChain);
    var partnerSequence = sequenceFromPdbChain(partner && partner.pdbText, project.interaction.partnerChain);
    if (!receptorSequence || !partnerSequence) {
      throw new Error("ColabFold export needs imported PDB text for both selected chains.");
    }
    return ">" + colabfoldName(project) + "\n" + wrapFastaSequence(receptorSequence + ":" + partnerSequence) + "\n";
  }

  function colabfoldSequenceText(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorSequence = sequenceFromPdbChain(receptor && receptor.pdbText, project.interaction.receptorChain);
    var partnerSequence = sequenceFromPdbChain(partner && partner.pdbText, project.interaction.partnerChain);
    if (!receptorSequence || !partnerSequence) {
      throw new Error("Sequence export needs imported PDB text for both selected chains.");
    }
    var receptorLabel = receptor && receptor.label || "Receptor";
    var partnerLabel = partner && partner.label || "Partner";
    return [
      "Wineinger NHG LocalColabFold sequences",
      "================================",
      "",
      "Selected chains:",
      "- Receptor: " + receptorLabel + " chain " + (project.interaction.receptorChain || "?") + " (" + receptorSequence.length + " aa)",
      "- Partner: " + partnerLabel + " chain " + (project.interaction.partnerChain || "?") + " (" + partnerSequence.length + " aa)",
      "",
      "ColabFold multimer FASTA:",
      ">" + colabfoldName(project),
      wrapFastaSequence(receptorSequence + ":" + partnerSequence),
      "",
      "Individual FASTA records:",
      ">receptor|" + filenameSlug(receptorLabel) + "|chain_" + (project.interaction.receptorChain || "?"),
      wrapFastaSequence(receptorSequence),
      ">partner|" + filenameSlug(partnerLabel) + "|chain_" + (project.interaction.partnerChain || "?"),
      wrapFastaSequence(partnerSequence),
      "",
      "Run with LocalColabFold:",
      "colabfold_batch " + colabfoldName(project) + ".fasta output --num-recycle 3",
      ""
    ].join("\n");
  }

  function colabfoldRunScript(project, shellType) {
    var fasta = colabfoldName(project) + ".fasta";
    if (shellType === "cmd") {
      return [
        "@echo off",
        "setlocal",
        "if not exist output mkdir output",
        "colabfold_batch \"" + fasta + "\" output --num-recycle 3",
        "echo ColabFold run complete. Import the output folder into Wineinger NHG.",
        ""
      ].join("\r\n");
    }
    return [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "mkdir -p output",
      "colabfold_batch \"" + fasta + "\" output --num-recycle 3",
      "echo \"ColabFold run complete. Import the output folder into Wineinger NHG.\"",
      ""
    ].join("\n");
  }

  function colabfoldInstructions(project) {
    var fasta = colabfoldName(project) + ".fasta";
    return [
      "Wineinger NHG: Optional LocalColabFold evidence",
      "==========================================",
      "",
      "This is optional evidence alongside the HADDOCK3 5-2-1 campaign.",
      "",
      "Run on this local GPU workstation after LocalColabFold is installed and available on PATH.",
      "",
      "Windows:",
      "",
      "   run-colabfold.cmd",
      "",
      "Linux / WSL:",
      "",
      "   bash run-colabfold.sh",
      "",
      "Manual command:",
      "",
      "   colabfold_batch " + fasta + " output --num-recycle 3",
      "",
      "After it finishes, import the ColabFold output folder into Wineinger NHG. Wineinger NHG will scan predicted complex PDBs, rank chain A/B interface residues, and fill the HADDOCK3 guided restraint fields.",
      ""
    ].join("\n");
  }

  function customProteinFasta(project) {
    var builder = project.proteinBuilder || defaultProteinBuilder();
    var sequence = normalizedProteinSequence(builder.sequence);
    if (!canExportCustomProtein(project)) {
      throw new Error("Custom protein export needs a name and a valid amino acid sequence.");
    }
    return ">" + customProteinSlug(project) + "\n" + wrapFastaSequence(sequence) + "\n";
  }

  function customProteinRunScript(project, shellType) {
    var fasta = customProteinFastaName(project);
    if (shellType === "cmd") {
      return [
        "@echo off",
        "setlocal",
        "if not exist output mkdir output",
        "colabfold_batch \"" + fasta + "\" output --num-recycle 3",
        "echo ColabFold run complete. Import the output folder into Wineinger NHG.",
        ""
      ].join("\r\n");
    }
    return [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "mkdir -p output",
      "colabfold_batch \"" + fasta + "\" output --num-recycle 3",
      "echo \"ColabFold run complete. Import the output folder into Wineinger NHG.\"",
      ""
    ].join("\n");
  }

  function customProteinInstructions(project) {
    return [
      "Wineinger NHG: Create your own protein with LocalColabFold",
      "===============================================",
      "",
      "1. Run on this local GPU workstation after LocalColabFold is installed and available on PATH.",
      "2. Import the output folder back into Wineinger NHG.",
      "3. Wineinger NHG will add the best predicted PDB as a normal protein component in this project.",
      "",
      "Windows:",
      "",
      "   run-colabfold.cmd",
      "",
      "Linux / WSL:",
      "",
      "   bash run-colabfold.sh",
      "",
      "Manual command:",
      "",
      "   colabfold_batch " + customProteinFastaName(project) + " output --num-recycle 3",
      ""
    ].join("\n");
  }

  function customProteinExportFiles(project) {
    return [
      { name: customProteinFastaName(project), contents: customProteinFasta(project), mimeType: "text/plain" },
      { name: "run-colabfold.cmd", contents: customProteinRunScript(project, "cmd"), mimeType: "text/plain" },
      { name: "run-colabfold.sh", contents: customProteinRunScript(project, "sh"), mimeType: "text/x-shellscript" },
      { name: "README-COLABFOLD.txt", contents: customProteinInstructions(project), mimeType: "text/plain" }
    ];
  }

  function haddockGuidanceComment(interaction) {
    if (interaction.guidance === "interface") {
      return "# Interface-guided run: Wineinger NHG stages actpass files and uses haddock3-restraints to generate inputs/restraints.tbl.";
    }
    if (interaction.guidance === "restraints") {
      return "# Experimental-restraint run: Wineinger NHG stages actpass files and uses haddock3-restraints to generate inputs/restraints.tbl.";
    }
    return "# Blind docking selected: HADDOCK3 center-of-mass restraints keep the proteins in contact during sampling.";
  }

  function parseResidueList(value) {
    var residues = [];
    String(value || "").split(/[,\s]+/).forEach(function (part) {
      var token = part.trim();
      var range = token.match(/^(\d+)-(\d+)$/);
      var single = token.match(/^\d+$/);
      if (range) {
        var start = Number(range[1]);
        var end = Number(range[2]);
        var low = Math.min(start, end);
        var high = Math.max(start, end);
        for (var residue = low; residue <= high; residue += 1) {
          residues.push(residue);
        }
      } else if (single) {
        residues.push(Number(token));
      }
    });
    return Array.from(new Set(residues)).sort(function (left, right) {
      return left - right;
    });
  }

  var aminoAcids = {
    ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C", GLN: "Q", GLU: "E", GLY: "G", HIS: "H", ILE: "I",
    LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P", SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
    MSE: "M", SEC: "U", PYL: "O", ASX: "B", GLX: "Z", XLE: "J", UNK: "X"
  };

  function sequenceFromPdbChain(pdbText, chainId) {
    var residues = [];
    var seen = {};
    String(pdbText || "").split(/\r?\n/).forEach(function (line) {
      if (!/^ATOM  /.test(line) || line.slice(21, 22).trim() !== chainId) {
        return;
      }
      var residueName = line.slice(17, 20).trim().toUpperCase();
      var residueKey = line.slice(22, 27).trim();
      if (!residueKey || seen[residueKey]) {
        return;
      }
      seen[residueKey] = true;
      residues.push(aminoAcids[residueName] || "X");
    });
    return residues.join("");
  }

  function wrapFastaSequence(sequence) {
    return String(sequence || "").replace(/(.{1,80})/g, "$1\n").trim();
  }

  function haddockUsesAmbiguousRestraints(project) {
    return project.interaction.method === "haddock3" &&
      project.interaction.guidance !== "blind" &&
      parseResidueList(project.interaction.receptorRestraints).length &&
      parseResidueList(project.interaction.partnerRestraints).length;
  }

  function haddockActpassFile(project, role) {
    var residues = parseResidueList(role === "receptor" ? project.interaction.receptorRestraints : project.interaction.partnerRestraints);
    var line = residues.join(" ");
    return [
      line,
      line
    ].join("\n");
  }

  function haddockConfig(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorFile = haddockInputFilename(receptor, "receptor");
    var partnerFile = haddockInputFilename(partner, "partner");
    var runDir = "outputs/" + (shellValue(projectSlug(project)) || "wineinger-nhg") + "-haddock3";
    return [
      "# Generated by Wineinger NHG for protein-protein docking with HADDOCK3.",
      haddockGuidanceComment(project.interaction),
      "run_dir = \"" + runDir + "\"",
      "ncores = " + Number(project.execution.cpus || 8),
      "mode = \"local\"",
      "",
      "molecules = [",
      "  \"inputs/" + receptorFile + "\",",
      "  \"inputs/" + partnerFile + "\"",
      "]",
      "",
      "[topoaa]",
      "",
      "[rigidbody]",
      haddockUsesAmbiguousRestraints(project) ? "ambig_fname = \"inputs/restraints.tbl\"" :
        project.interaction.guidance === "blind" ? "cmrest = true" : "# Add receptor and partner residues in Wineinger NHG to export inputs/restraints.tbl.",
      "",
      "[seletop]",
      "",
      "[flexref]",
      haddockUsesAmbiguousRestraints(project) ? "ambig_fname = \"inputs/restraints.tbl\"" : "",
      "",
      "",
      "[emref]",
      haddockUsesAmbiguousRestraints(project) ? "ambig_fname = \"inputs/restraints.tbl\"" : "",
      "",
      "",
      "[clustfcc]",
      "",
      "[caprieval]",
      ""
    ].join("\n");
  }

  function haddockInputCommand(component, role) {
    var filename = haddockInputFilename(component, role);
    var rawFilename = "inputs/raw/" + filename;
    var sourceId = component && component.sourceId ? String(component.sourceId).toUpperCase() : "";
    var rcsbUrl = component && component.sourceUrl;
    if (!rcsbUrl && /^[0-9A-Z]{4}$/.test(sourceId) && (component.source === "rcsb" || component.source === "demo")) {
      rcsbUrl = "https://files.rcsb.org/download/" + sourceId + ".pdb";
    }
    if (rcsbUrl) {
      return "curl -fL --retry 3 -o " + rawFilename + " " + shellValue(rcsbUrl);
    }
    return [
      "if [[ ! -f " + rawFilename + " ]]; then",
      "  echo \"Stage your " + role + " PDB as " + rawFilename + " before submitting the job.\" >&2",
      "  exit 2",
      "fi"
    ].join("\n");
  }

  function haddockStageScript(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorFile = haddockInputFilename(receptor, "receptor");
    var partnerFile = haddockInputFilename(partner, "partner");
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. Run this on the Argon login node before qsub.",
      "set -euo pipefail",
      "cd \"$(dirname \"$(readlink -f \"$0\")\")\"",
      "mkdir -p inputs/raw outputs logs",
      "if [[ -f receptor.actpass && -f partner.actpass ]]; then",
      "  if ! command -v haddock3-restraints >/dev/null 2>&1; then",
      "    echo \"haddock3-restraints was not found. Activate haddock_env before staging guided restraints.\" >&2",
      "    exit 2",
      "  fi",
      "  cp receptor.actpass inputs/receptor.actpass",
      "  cp partner.actpass inputs/partner.actpass",
      "  haddock3-restraints active_passive_to_ambig inputs/receptor.actpass inputs/partner.actpass --segid-one A --segid-two B > inputs/restraints.tbl",
      "  haddock3-restraints validate_tbl inputs/restraints.tbl --silent >/dev/null",
      "fi",
      "",
      "prepare_haddock_chain() {",
      "  local source_file=\"$1\" target_file=\"$2\" source_chain=\"$3\" target_chain=\"$4\"",
      "  awk -v source_chain=\"${source_chain}\" -v target_chain=\"${target_chain}\" '",
      "    /^ATOM  / && substr($0, 22, 1) == source_chain {",
      "      line = substr($0, 1, 21) target_chain substr($0, 23)",
      "      line = sprintf(\"%-76s\", line)",
      "      print substr(line, 1, 72) sprintf(\"%-4s\", target_chain) substr(line, 77)",
      "      atoms += 1",
      "    }",
      "    END { if (atoms == 0) exit 2; print \"END\" }",
      "  ' \"${source_file}\" > \"${target_file}\" || {",
      "    echo \"No ATOM records found for selected chain ${source_chain} in ${source_file}.\" >&2",
      "    exit 2",
      "  }",
      "}",
      "",
      haddockInputCommand(receptor, "receptor"),
      haddockInputCommand(partner, "partner"),
      "",
      "prepare_haddock_chain inputs/raw/" + receptorFile + " inputs/" + receptorFile + " " + shellValue(project.interaction.receptorChain || "A") + " A",
      "prepare_haddock_chain inputs/raw/" + partnerFile + " inputs/" + partnerFile + " " + shellValue(project.interaction.partnerChain || "A") + " B",
      "",
      "echo \"HADDOCK3 inputs are ready in inputs/.\"",
      "echo \"Submit with: qsub " + (shellValue(projectSlug(project)) || "wineinger-nhg") + "-haddock3.sge.job\"",
      ""
    ].join("\n");
  }

  function haddockSgeScript(project) {
    var name = (shellValue(projectSlug(project)) || "wineinger-nhg").slice(0, 38) + "_hd3";
    var configName = (shellValue(projectSlug(project)) || "wineinger-nhg") + "-haddock3.cfg";
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG for HADDOCK3 protein-protein docking on Argon.",
      "# HADDOCK3/CNS is CPU-oriented; no GPU allocation is requested here.",
      "#$ -S /bin/bash",
      "#$ -N " + name,
      "#$ -cwd",
      "#$ -j y",
      "#$ -o logs/haddock3-job.log",
      "#$ -l h_rt=" + shellValue(project.execution.walltime || "24:00:00"),
      "#$ -pe smp " + Number(project.execution.cpus || 8),
      "",
      "set -euo pipefail",
      "cd \"${SGE_O_WORKDIR:-$(pwd -P)}\"",
      "mkdir -p inputs outputs logs",
      "",
      "HADDOCK3_CMD=\"${HADDOCK3_CMD:-haddock3}\"",
      "HADDOCK3_CFG=\"${HADDOCK3_CFG:-" + configName + "}\"",
      "if ! command -v \"${HADDOCK3_CMD}\" >/dev/null 2>&1; then",
      "  echo \"HADDOCK3 was not found. Activate your Argon HADDOCK3 environment or submit with HADDOCK3_CMD=/path/to/haddock3 qsub " + configName.replace(".cfg", ".sge.job") + "\" >&2",
      "  exit 2",
      "fi",
      "if [[ ! -f \"${HADDOCK3_CFG}\" ]]; then",
      "  echo \"Missing ${HADDOCK3_CFG}. Keep the exported config beside this job script.\" >&2",
      "  exit 2",
      "fi",
      "",
      "\"${HADDOCK3_CMD}\" \"${HADDOCK3_CFG}\"",
      "",
      "echo \"HADDOCK3 docking complete. Review ranked complexes under outputs/.\"",
      ""
    ].join("\n");
  }

  function haddockCampaignSubmitScript(project) {
    var base = shellValue(projectSlug(project)) || "wineinger-nhg";
    var configName = base + "-haddock3.cfg";
    var jobName = base + "-haddock3.sge.job";
    var guided = haddockUsesAmbiguousRestraints(project);
    var phase = guided ? "guided" : "blind";
    var count = guided ? DISCOVERY_GUIDED_JOBS : DISCOVERY_BLIND_JOBS;
    var jobPrefix = shellValue(base).slice(0, 24) + "_" + phase;
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. Submit the HADDOCK3 " + phase + " phase for the 5-2-1 discovery campaign.",
      "set -euo pipefail",
      "cd \"$(dirname \"$(readlink -f \"$0\")\")\"",
      "mkdir -p configs logs outputs",
      "",
      "BASE_CFG=\"" + configName + "\"",
      "JOB_SCRIPT=\"" + jobName + "\"",
      "HADDOCK3_CMD=\"${HADDOCK3_CMD:-$HOME/miniforge3/envs/haddock_env/bin/haddock3}\"",
      "",
      "if [[ ! -f \"${BASE_CFG}\" || ! -f \"${JOB_SCRIPT}\" ]]; then",
      "  echo \"Missing ${BASE_CFG} or ${JOB_SCRIPT}. Keep all exported HADDOCK3 files together.\" >&2",
      "  exit 2",
      "fi",
      "if [[ ! -d inputs ]]; then",
      "  echo \"Missing inputs/. Run bash " + base + "-stage-haddock-inputs.sh before submitting the campaign.\" >&2",
      "  exit 2",
      "fi",
      "",
      "for index in $(seq -w 1 " + count + "); do",
      "  cfg=\"configs/" + base + "-" + phase + "-${index}.cfg\"",
      "  run_dir=\"outputs/" + base + "-" + phase + "-${index}\"",
      "  awk -v run_dir=\"${run_dir}\" '",
      "    BEGIN { replaced = 0 }",
      "    /^run_dir = / && replaced == 0 { print \"run_dir = \\\"\" run_dir \"\\\"\"; replaced = 1; next }",
      "    { print }",
      "  ' \"${BASE_CFG}\" > \"${cfg}\"",
      "  qsub -N \"" + jobPrefix + "_${index}\" -o \"logs/" + phase + "-${index}.log\" -v HADDOCK3_CMD=\"${HADDOCK3_CMD}\",HADDOCK3_CFG=\"${cfg}\" \"${JOB_SCRIPT}\"",
      "done",
      "",
      "echo \"Submitted " + count + " " + phase + " HADDOCK3 job(s).\"",
      "echo \"Check with: qstat -u $USER\"",
      ""
    ].join("\n");
  }

  function haddockArgonInstructions(project) {
    var base = shellValue(projectSlug(project)) || "wineinger-nhg";
    var folder = haddockFolderName(project);
    return [
      "Wineinger NHG: Run HADDOCK3 on Argon",
      "================================",
      "",
      "One-time HADDOCK3 environment setup",
      "-----------------------------------",
      "",
      "If you already have a working haddock_env, activate it or use the HADDOCK3_CMD qsub command below.",
      "If you do not have one yet, set it up from an Argon login node before submitting jobs:",
      "",
      "   cd ~",
      "   module purge",
      "   module load stack/2022.2",
      "   module load python",
      "   python -m venv haddock_env",
      "   source ~/haddock_env/bin/activate",
      "   python -m pip install --upgrade pip",
      "   python -m pip install haddock3",
      "",
      "If you use Miniforge/Conda instead, create or activate your environment and confirm the executable path:",
      "",
      "   conda activate haddock_env",
      "   which haddock3",
      "   haddock3 --version",
      "",
      "Use the path printed by which haddock3 as HADDOCK3_CMD when submitting. For the known Miniforge setup, Wineinger NHG uses:",
      "",
      "   $HOME/miniforge3/envs/haddock_env/bin/haddock3",
      "",
      "Run these commands from the uploaded docking project folder on an Argon login node.",
      "",
      "Wineinger NHG 5-2-1 discovery campaign",
      "---------------------------------",
      "",
      "Use this default campaign order for unknown protein interfaces:",
      "",
      "   1. Run " + DISCOVERY_BLIND_JOBS + " blind HADDOCK3 jobs.",
      "   2. Import those outputs into Wineinger NHG and infer ranked interface residues across poses.",
      "   3. Export guided HADDOCK3 files and run " + DISCOVERY_GUIDED_JOBS + " guided jobs.",
      "   4. Import guided outputs, select the best pose, then run " + DISCOVERY_GROMACS_JOBS + " GROMACS MD/analysis workflow.",
      "",
      haddockUsesAmbiguousRestraints(project) ?
        "This export is the guided phase. The campaign helper submits " + DISCOVERY_GUIDED_JOBS + " guided HADDOCK3 jobs." :
        "This export is the blind phase. The campaign helper submits " + DISCOVERY_BLIND_JOBS + " blind HADDOCK3 jobs.",
      "",
      "LocalColabFold sidecar files",
      "----------------------------",
      "",
      "This export also includes selected-chain sequence files for a local ColabFold run:",
      "",
      "   " + colabfoldName(project) + ".fasta",
      "   LOCAL-COLABFOLD-SEQUENCES.txt",
      "",
      "Run the FASTA on your local GPU workstation if you want independent AlphaFold/ColabFold interface evidence before choosing guided HADDOCK3 restraints.",
      "",
      "1. Prepare the selected receptor and partner chains:",
      "",
      "   bash " + base + "-stage-haddock-inputs.sh",
      "",
      "2. Confirm the staged files exist:",
      "",
      "   ls -lh inputs",
      "",
      haddockUsesAmbiguousRestraints(project) ? "This export includes receptor.actpass and partner.actpass. The staging helper uses haddock3-restraints active_passive_to_ambig to generate the final AIR file:" : "",
      haddockUsesAmbiguousRestraints(project) ? "" : "",
      haddockUsesAmbiguousRestraints(project) ? "   ls -lh inputs/restraints.tbl" : "",
      haddockUsesAmbiguousRestraints(project) ? "" : "",
      haddockUsesAmbiguousRestraints(project) ? "The HADDOCK3 config references this generated file with ambig_fname under rigidbody, flexref, and emref. The exported residues use staged HADDOCK chain IDs A for receptor and B for partner." : "",
      haddockUsesAmbiguousRestraints(project) ? "" : "",
      "3. Submit HADDOCK3 using the verified haddock_env executable:",
      "",
      "   qsub -v HADDOCK3_CMD=\"$HOME/miniforge3/envs/haddock_env/bin/haddock3\" " + base + "-haddock3.sge.job",
      "",
      "For the 5-2-1 campaign, submit the phase batch instead of the single-job command:",
      "",
      "   bash " + base + "-submit-haddock-campaign.sh",
      "",
      "4. Check whether jobs are queued or running:",
      "",
      "   qstat -u $USER",
      "",
      "5. Watch the run log:",
      "",
      "   tail -f logs/haddock3-job.log",
      "",
      "Press Ctrl+C to stop watching the log without stopping the submitted job.",
      "",
      "Copy completed outputs back to Wineinger NHG",
      "--------------------------------------",
      "",
      "Run ONE of these commands from Windows PowerShell, not from the Argon terminal.",
      "Replace <HAWKID> with your Argon username. If you uploaded the folder somewhere else, update the remote path.",
      "",
      "On campus or connected through the UI VPN:",
      "",
      "   scp -r \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/" + folder + "/outputs\" \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\"",
      "",
      "Off campus without the UI VPN:",
      "",
      "   scp -P 40 -r \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/" + folder + "/outputs\" \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\"",
      "",
      "The port option is uppercase -P. Keep the quoted Windows destination without a trailing backslash.",
      ""
    ].filter(function (line) {
      return line !== null && line !== undefined;
    }).join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
  }

  function haddockFolderName(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    var receptorName = filenameSlug(receptor && (receptor.label || receptor.sourceId) || "receptor").slice(0, 42) || "receptor";
    var partnerName = filenameSlug(partner && (partner.label || partner.sourceId) || "partner").slice(0, 42) || "partner";
    return receptorName + "--" + partnerName;
  }

  function gromacsPreparationFolderName(project) {
    var receptor = interactionComponent(project, project.interaction.receptorId);
    var partner = interactionComponent(project, project.interaction.partnerId);
    if (receptor || partner) {
      return haddockFolderName(project) + "--gromacs-prep";
    }
    return (projectSlug(project) || "selected-complex") + "--gromacs-prep";
  }

  function gromacsMdpFiles(project) {
    var preparation = project.results.preparation;
    var temperature = Number(preparation.temperatureKelvin || 300);
    var productionSteps = Math.max(50000, Math.round(Number(project.workflow.settings.mdNanoseconds || 10) * 500000));
    return {
      "ions.mdp": [
        "integrator = steep",
        "emtol = 1000.0",
        "emstep = 0.01",
        "nsteps = 50000",
        "cutoff-scheme = Verlet",
        "nstlist = 10",
        "coulombtype = PME",
        "rcoulomb = 1.0",
        "rvdw = 1.0",
        "pbc = xyz",
        ""
      ].join("\n"),
      "minim.mdp": [
        "integrator = steep",
        "emtol = 1000.0",
        "emstep = 0.01",
        "nsteps = 50000",
        "cutoff-scheme = Verlet",
        "nstlist = 10",
        "coulombtype = PME",
        "rcoulomb = 1.0",
        "rvdw = 1.0",
        "pbc = xyz",
        ""
      ].join("\n"),
      "nvt.mdp": [
        "define = -DPOSRES",
        "integrator = md",
        "dt = 0.002",
        "nsteps = 50000",
        "nstxout-compressed = 5000",
        "nstenergy = 500",
        "nstlog = 500",
        "continuation = no",
        "constraint_algorithm = lincs",
        "constraints = h-bonds",
        "cutoff-scheme = Verlet",
        "nstlist = 10",
        "coulombtype = PME",
        "rcoulomb = 1.0",
        "rvdw = 1.0",
        "tcoupl = V-rescale",
        "tc-grps = Protein Non-Protein",
        "tau_t = 0.1 0.1",
        "ref_t = " + temperature + " " + temperature,
        "pcoupl = no",
        "pbc = xyz",
        "gen_vel = yes",
        "gen_temp = " + temperature,
        "gen_seed = -1",
        ""
      ].join("\n"),
      "npt.mdp": [
        "define = -DPOSRES",
        "integrator = md",
        "dt = 0.002",
        "nsteps = 50000",
        "nstxout-compressed = 5000",
        "nstenergy = 500",
        "nstlog = 500",
        "continuation = yes",
        "constraint_algorithm = lincs",
        "constraints = h-bonds",
        "cutoff-scheme = Verlet",
        "nstlist = 10",
        "coulombtype = PME",
        "rcoulomb = 1.0",
        "rvdw = 1.0",
        "tcoupl = V-rescale",
        "tc-grps = Protein Non-Protein",
        "tau_t = 0.1 0.1",
        "ref_t = " + temperature + " " + temperature,
        "pcoupl = Parrinello-Rahman",
        "pcoupltype = isotropic",
        "tau_p = 2.0",
        "ref_p = 1.0",
        "compressibility = 4.5e-5",
        "refcoord_scaling = all",
        "pbc = xyz",
        "gen_vel = no",
        ""
      ].join("\n"),
      "production.mdp": [
        "integrator = md",
        "dt = 0.002",
        "nsteps = " + productionSteps,
        "nstxout-compressed = 5000",
        "nstenergy = 1000",
        "nstlog = 1000",
        "continuation = yes",
        "constraint_algorithm = lincs",
        "constraints = h-bonds",
        "cutoff-scheme = Verlet",
        "nstlist = 10",
        "coulombtype = PME",
        "rcoulomb = 1.0",
        "rvdw = 1.0",
        "tcoupl = V-rescale",
        "tc-grps = Protein Non-Protein",
        "tau_t = 0.1 0.1",
        "ref_t = " + temperature + " " + temperature,
        "pcoupl = Parrinello-Rahman",
        "pcoupltype = isotropic",
        "tau_p = 2.0",
        "ref_p = 1.0",
        "compressibility = 4.5e-5",
        "pbc = xyz",
        "gen_vel = no",
        ""
      ].join("\n")
    };
  }

  function gromacsPreparationScript(project) {
    var preparation = project.results.preparation;
    var execution = project.execution;
    var name = (shellValue(projectSlug(project)) || "wineinger-nhg").slice(0, 34) + "_prep";
    var gmx = shellValue(execution.command || "gmx");
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. CPU preparation job for a selected HADDOCK3 complex.",
      "# The resulting inputs/production.tpr is intended for the exported GPU production job after log review.",
      "#$ -S /bin/bash",
      "#$ -N " + name,
      "#$ -cwd",
      "#$ -j y",
      "#$ -o logs/gromacs-prep.log",
      "#$ -l h_rt=12:00:00",
      "#$ -pe smp " + Number(execution.cpus || 8),
      "",
      "set -euo pipefail",
      "cd \"${SGE_O_WORKDIR:-$(pwd -P)}\"",
      "mkdir -p build inputs logs outputs",
      "export OMP_NUM_THREADS=\"${NSLOTS:-1}\"",
      "module purge",
      execution.prerequisiteModule ? "module load " + shellValue(execution.prerequisiteModule) : "# No prerequisite module configured.",
      "module load " + shellValue(execution.module),
      "",
      "if [[ ! -f selected-complex.pdb ]]; then",
      "  echo \"Missing selected-complex.pdb from Wineinger NHG result selection.\" >&2",
      "  exit 2",
      "fi",
      "",
      gmx + " --version",
      "(cd build && " + gmx + " pdb2gmx -f ../selected-complex.pdb -o processed.gro -p topol.top -i posre.itp -ff " + shellValue(preparation.forceField) + " -water " + shellValue(preparation.waterModel) + " -ignh)",
      gmx + " editconf -f build/processed.gro -o build/boxed.gro -c -d " + Number(preparation.paddingNanometers) + " -bt " + shellValue(preparation.boxShape),
      gmx + " solvate -cp build/boxed.gro -cs spc216.gro -o build/solvated.gro -p build/topol.top",
      gmx + " grompp -f ions.mdp -c build/solvated.gro -p build/topol.top -po logs/ions-mdout.mdp -o build/ions.tpr",
      "echo SOL | " + gmx + " genion -s build/ions.tpr -o build/solvated-ions.gro -p build/topol.top -pname NA -nname CL -neutral -conc " + Number(preparation.saltMolar),
      gmx + " grompp -f minim.mdp -c build/solvated-ions.gro -p build/topol.top -po logs/minim-mdout.mdp -o build/em.tpr",
      gmx + " mdrun -deffnm build/em -ntmpi 1 -ntomp ${NSLOTS}",
      gmx + " grompp -f nvt.mdp -c build/em.gro -r build/em.gro -p build/topol.top -po logs/nvt-mdout.mdp -o build/nvt.tpr",
      gmx + " mdrun -deffnm build/nvt -ntmpi 1 -ntomp ${NSLOTS}",
      gmx + " grompp -f npt.mdp -c build/nvt.gro -r build/nvt.gro -t build/nvt.cpt -p build/topol.top -po logs/npt-mdout.mdp -o build/npt.tpr",
      gmx + " mdrun -deffnm build/npt -ntmpi 1 -ntomp ${NSLOTS}",
      gmx + " grompp -f production.mdp -c build/npt.gro -t build/npt.cpt -p build/topol.top -po logs/production-mdout.mdp -o inputs/production.tpr",
      "cp build/npt.gro inputs/production-start.gro",
      "cp build/topol.top inputs/topol.top",
      "cp build/*.itp inputs/ 2>/dev/null || true",
      "",
      "echo \"Preparation complete: inputs/production.tpr is ready for reviewed GPU production submission.\"",
      ""
    ].join("\n");
  }

  function gromacsOrganizeScript(project) {
    var base = projectSlug(project) || "wineinger-nhg";
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. Keep the Argon GROMACS workspace organized before submission.",
      "set -euo pipefail",
      "cd \"$(dirname \"$(readlink -f \"$0\")\")\"",
      "mkdir -p build inputs logs outputs",
      "",
      "move_if_present() {",
      "  local target=\"$1\"",
      "  shift",
      "  local file",
      "  for file in \"$@\"; do",
      "    if [[ -e \"${file}\" ]]; then",
      "      mv -n \"${file}\" \"${target}/\"",
      "    fi",
      "  done",
      "}",
      "",
      "shopt -s nullglob",
      "move_if_present build posre*.itp",
      "move_if_present logs gromacs-prep.log wineinger-nhg-job.log mdout.mdp \\#mdout.mdp.*\\#",
      "shopt -u nullglob",
      "",
      "echo \"Workspace ready. Submit preparation with: bash " + base + "-submit-gromacs-prep.sh\"",
      ""
    ].join("\n");
  }

  function gromacsSubmitScript(project, stage) {
    var base = projectSlug(project) || "wineinger-nhg";
    var job = base + "-gromacs-" + stage + ".sge.job";
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. Creates required folders before submitting the SGE job.",
      "set -euo pipefail",
      "cd \"$(dirname \"$(readlink -f \"$0\")\")\"",
      "bash ./" + base + "-organize-gromacs-folder.sh",
      "qsub ./" + job,
      ""
    ].join("\n");
  }

  function gromacsAnalysisScript() {
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. Analyze a completed GROMACS protein-protein trajectory.",
      "set -euo pipefail",
      "cd \"$(dirname \"$(readlink -f \"$0\")\")\"",
      "mkdir -p analysis logs",
      "",
      "GMX=\"${GMX:-gmx}\"",
      "TPR=inputs/production.tpr",
      "XTC=outputs/production.xtc",
      "WHOLE=analysis/production-whole.xtc",
      "NOJUMP=analysis/production-nojump.xtc",
      "CENTERED=analysis/production-centered.xtc",
      "MOVIE_XTC=analysis/production-protein-only.xtc",
      "MOVIE_GRO=analysis/production-protein-only.gro",
      "MOVIE_PDB=analysis/production-protein-only.pdb",
      "",
      "if [[ ! -f \"${TPR}\" || ! -f \"${XTC}\" ]]; then",
      "  echo \"Missing ${TPR} or ${XTC}. Finish the production run before analysis.\" >&2",
      "  exit 2",
      "fi",
      "",
      "printf \"System\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${XTC}\" -o \"${WHOLE}\" -pbc whole",
      "printf \"System\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${WHOLE}\" -o \"${NOJUMP}\" -pbc nojump",
      "printf \"Protein\\nSystem\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${NOJUMP}\" -o \"${CENTERED}\" -pbc mol -center",
      "printf \"Backbone\\nProtein\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${CENTERED}\" -o \"${MOVIE_XTC}\" -fit rot+trans",
      "printf \"Protein\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${CENTERED}\" -o \"${MOVIE_GRO}\" -dump 0",
      "printf \"Protein\\n\" | \"${GMX}\" trjconv -s \"${TPR}\" -f \"${CENTERED}\" -o \"${MOVIE_PDB}\" -dump 0",
      "printf \"Backbone\\nBackbone\\n\" | \"${GMX}\" rms -s \"${TPR}\" -f \"${CENTERED}\" -o analysis/complex-backbone-rmsd.xvg -tu ns",
      "printf \"C-alpha\\n\" | \"${GMX}\" rmsf -s \"${TPR}\" -f \"${CENTERED}\" -o analysis/protein-ca-rmsf.xvg -res",
      "printf \"Protein\\n\" | \"${GMX}\" gyrate -s \"${TPR}\" -f \"${CENTERED}\" -o analysis/protein-radius-gyration.xvg",
      "printf \"Protein\\n\" | \"${GMX}\" mindist -s \"${TPR}\" -f \"${CENTERED}\" -od analysis/protein-periodic-image-mindist.xvg -pi",
      "",
      "summarize_xvg() {",
      "  awk '!/^[@#]/ && NF >= 2 { sum += $2; count += 1; last = $2; if (count == 1 || $2 < min) min = $2; if (count == 1 || $2 > max) max = $2 } END { if (count) printf \"last=%.4f mean=%.4f min=%.4f max=%.4f\", last, sum / count, min, max; else printf \"no-data\" }' \"$1\"",
      "}",
      "",
      "xvg_stat() {",
      "  awk -v metric=\"$2\" '!/^[@#]/ && NF >= 2 { sum += $2; count += 1; last = $2; if (count == 1 || $2 < min) min = $2; if (count == 1 || $2 > max) max = $2 } END { if (!count) print \"nan\"; else if (metric == \"last\") printf \"%.6f\", last; else if (metric == \"mean\") printf \"%.6f\", sum / count; else if (metric == \"min\") printf \"%.6f\", min; else if (metric == \"max\") printf \"%.6f\", max }' \"$1\"",
      "}",
      "",
      "lt_value() {",
      "  awk -v value=\"$1\" -v limit=\"$2\" 'BEGIN { exit !(value + 0 < limit + 0) }'",
      "}",
      "",
      "gt_value() {",
      "  awk -v value=\"$1\" -v limit=\"$2\" 'BEGIN { exit !(value + 0 > limit + 0) }'",
      "}",
      "",
      "count_itp_atoms() {",
      "  awk 'BEGIN { atoms = 0; section = \"\" } /^\\[/ { section = $0; next } section ~ /atoms/ && $1 ~ /^[0-9]+$/ { atoms += 1 } END { print atoms }' \"$1\"",
      "}",
      "",
      "shopt -s nullglob",
      "CHAIN_ITPS=(inputs/topol_Protein_chain_*.itp build/topol_Protein_chain_*.itp topol_Protein_chain_*.itp inputs/Protein_chain_*.itp)",
      "shopt -u nullglob",
      "INTERFACE_STATUS=\"Interface metrics skipped: expected exactly two topol_Protein_chain_*.itp files in inputs/, build/, or the project folder.\"",
      "if [[ ${#CHAIN_ITPS[@]} -eq 2 ]]; then",
      "  RECEPTOR_ATOMS=$(count_itp_atoms \"${CHAIN_ITPS[0]}\")",
      "  PARTNER_ATOMS=$(count_itp_atoms \"${CHAIN_ITPS[1]}\")",
      "  PARTNER_START=$((RECEPTOR_ATOMS + 1))",
      "  PARTNER_END=$((RECEPTOR_ATOMS + PARTNER_ATOMS))",
      "  {",
      "    echo \"[ Receptor ]\"",
      "    seq 1 \"${RECEPTOR_ATOMS}\"",
      "    echo \"[ Partner ]\"",
      "    seq \"${PARTNER_START}\" \"${PARTNER_END}\"",
      "  } > analysis/interface.ndx",
      "  printf \"Receptor\\nPartner\\n\" | \"${GMX}\" mindist -s \"${TPR}\" -f \"${CENTERED}\" -n analysis/interface.ndx -od analysis/interface-minimum-distance.xvg -on analysis/interface-contact-count.xvg -d 0.6",
      "  printf \"Receptor\\nPartner\\n\" | \"${GMX}\" hbond -s \"${TPR}\" -f \"${CENTERED}\" -n analysis/interface.ndx -num analysis/interface-hydrogen-bonds.xvg",
      "  INTERFACE_STATUS=\"Interface metrics generated from ${CHAIN_ITPS[0]} and ${CHAIN_ITPS[1]}.\"",
      "fi",
      "",
      "{",
      "  echo \"Wineinger NHG protein-only movie files\"",
      "  echo \"================================\"",
      "  echo",
      "  echo \"Load this structure first:\"",
      "  echo \"  production-protein-only.gro\"",
      "  echo",
      "  echo \"Then load this trajectory onto it:\"",
      "  echo \"  production-protein-only.xtc\"",
      "  echo",
      "  echo \"Use these files for movie viewing. They remove solvent/ions, repair periodic-boundary jumps, and fit the protein backbone for smooth playback.\"",
      "  echo",
      "  echo \"A PDB first-frame copy is also included for viewers that prefer PDB:\"",
      "  echo \"  production-protein-only.pdb\"",
      "} > analysis/VISUALIZATION-FILES.txt",
      "",
      "{",
      "  echo \"Wineinger NHG GROMACS post-run analysis\"",
      "  echo \"================================\"",
      "  echo",
      "  echo \"Candidate interpretation only: persistence during MD supports further investigation but does not prove biological binding.\"",
      "  echo",
      "  echo \"Movie files:\"",
      "  echo \"- Structure: analysis/production-protein-only.gro\"",
      "  echo \"- Trajectory: analysis/production-protein-only.xtc\"",
      "  echo \"- Notes: analysis/VISUALIZATION-FILES.txt\"",
      "  echo",
      "  echo \"Complex backbone RMSD (nm): $(summarize_xvg analysis/complex-backbone-rmsd.xvg)\"",
      "  echo \"Protein radius of gyration (nm): $(summarize_xvg analysis/protein-radius-gyration.xvg)\"",
      "  echo \"Protein periodic-image minimum distance (nm): $(summarize_xvg analysis/protein-periodic-image-mindist.xvg)\"",
      "  echo",
      "  echo \"${INTERFACE_STATUS}\"",
      "  if [[ -f analysis/interface-minimum-distance.xvg ]]; then",
      "    echo \"Interface minimum distance (nm): $(summarize_xvg analysis/interface-minimum-distance.xvg)\"",
      "    echo \"Interface contact count within 0.6 nm: $(summarize_xvg analysis/interface-contact-count.xvg)\"",
      "    echo \"Interface hydrogen bonds: $(summarize_xvg analysis/interface-hydrogen-bonds.xvg)\"",
      "  fi",
      "  echo",
      "  echo \"Automated interpretation\"",
      "  echo \"------------------------\"",
      "  RMSD_MAX=$(xvg_stat analysis/complex-backbone-rmsd.xvg max)",
      "  RMSD_LAST=$(xvg_stat analysis/complex-backbone-rmsd.xvg last)",
      "  RG_MAX=$(xvg_stat analysis/protein-radius-gyration.xvg max)",
      "  RG_MEAN=$(xvg_stat analysis/protein-radius-gyration.xvg mean)",
      "  LOW_PRIORITY_MARKERS=0",
      "  if lt_value \"${RMSD_MAX}\" 0.8 && lt_value \"${RMSD_LAST}\" 0.7; then",
      "    echo \"- RMSD remains bounded after relaxation, which supports a stable short MD candidate.\"",
      "  elif gt_value \"${RMSD_MAX}\" 1.5 || gt_value \"${RMSD_LAST}\" 1.0; then",
      "    echo \"- RMSD is high; inspect the trajectory for separation, unfolding, or periodic-boundary artifacts.\"",
      "    LOW_PRIORITY_MARKERS=$((LOW_PRIORITY_MARKERS + 1))",
      "  else",
      "    echo \"- RMSD is moderate; judge it together with interface distance and contacts.\"",
      "  fi",
      "  if gt_value \"${RG_MAX}\" \"$(awk -v mean=\"${RG_MEAN}\" 'BEGIN { printf \"%.6f\", mean * 1.4 }')\"; then",
      "    echo \"- Radius of gyration expands noticeably; inspect for unfolding or imaging problems.\"",
      "    LOW_PRIORITY_MARKERS=$((LOW_PRIORITY_MARKERS + 1))",
      "  else",
      "    echo \"- Radius of gyration stays reasonably compact.\"",
      "  fi",
      "  if [[ -f analysis/interface-minimum-distance.xvg ]]; then",
      "    DIST_MAX=$(xvg_stat analysis/interface-minimum-distance.xvg max)",
      "    DIST_LAST=$(xvg_stat analysis/interface-minimum-distance.xvg last)",
      "    DIST_MEAN=$(xvg_stat analysis/interface-minimum-distance.xvg mean)",
      "    CONTACT_LAST=$(xvg_stat analysis/interface-contact-count.xvg last)",
      "    CONTACT_MEAN=$(xvg_stat analysis/interface-contact-count.xvg mean)",
      "    if lt_value \"${DIST_MAX}\" 0.8 && lt_value \"${DIST_MEAN}\" 0.5; then",
      "      echo \"- Interface minimum distance stays low, so the partners remain in close contact.\"",
      "    else",
      "      echo \"- Interface distance increases; check whether the partners drift apart.\"",
      "      LOW_PRIORITY_MARKERS=$((LOW_PRIORITY_MARKERS + 1))",
      "    fi",
      "    if gt_value \"${CONTACT_LAST}\" 50 && gt_value \"${CONTACT_MEAN}\" 50; then",
      "      echo \"- Interface contacts remain strongly nonzero after relaxation.\"",
      "    else",
      "      echo \"- Interface contacts are low; this is a warning sign for dissociation.\"",
      "      LOW_PRIORITY_MARKERS=$((LOW_PRIORITY_MARKERS + 1))",
      "    fi",
      "    if gt_value \"${DIST_LAST}\" 1.0 && lt_value \"${CONTACT_LAST}\" 10; then",
      "      echo \"- Probably not worth chasing marker: interface distance is high while contacts are near zero at the end of the run.\"",
      "      LOW_PRIORITY_MARKERS=$((LOW_PRIORITY_MARKERS + 1))",
      "    fi",
      "  fi",
      "  if [[ ${LOW_PRIORITY_MARKERS} -ge 3 ]]; then",
      "    echo \"- Probably not worth chasing marker: multiple independent stability/interface warnings were detected.\"",
      "  fi",
      "  echo \"- Treat this as screening support, not proof of biological binding.\"",
      "} > analysis/ANALYSIS-SUMMARY.txt",
      "",
      "echo \"Post-run analysis complete. Review analysis/ANALYSIS-SUMMARY.txt and the .xvg plots.\"",
      ""
    ].join("\n");
  }

  function gromacsAnalysisSgeScript(project) {
    var execution = project.execution;
    var base = projectSlug(project) || "wineinger-nhg";
    var name = shellValue(base).slice(0, 32) + "_analysis";
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG. CPU post-run trajectory analysis on Argon.",
      "#$ -S /bin/bash",
      "#$ -N " + name,
      "#$ -cwd",
      "#$ -j y",
      "#$ -o logs/gromacs-analysis.log",
      "#$ -l h_rt=02:00:00",
      "#$ -pe smp 1",
      "",
      "set -euo pipefail",
      "cd \"${SGE_O_WORKDIR:-$(pwd -P)}\"",
      "mkdir -p analysis logs",
      "module purge",
      execution.prerequisiteModule ? "module load " + shellValue(execution.prerequisiteModule) : "# No prerequisite module configured.",
      "module load " + shellValue(execution.module || "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5"),
      "",
      "bash ./" + base + "-run-gromacs-analysis.sh",
      ""
    ].join("\n");
  }

  function gromacsArgonInstructions(project) {
    var base = projectSlug(project) || "wineinger-nhg";
    var folder = gromacsPreparationFolderName(project);
    return [
      "Wineinger NHG: Run GROMACS Preparation and Production on Argon",
      "========================================================",
      "",
      "Upload the preparation bundle",
      "-----------------------------",
      "",
      "Run ONE of these commands from Windows PowerShell, not from the Argon terminal.",
      "Replace <HAWKID> with your Argon username.",
      "",
      "On campus or connected through the UI VPN:",
      "",
      "   scp -r \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\" \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/\"",
      "",
      "Off campus without the UI VPN:",
      "",
      "   scp -P 40 -r \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\" \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/\"",
      "",
      "The port option is uppercase -P. Keep quoted Windows paths without a trailing backslash.",
      "",
      "Run CPU preparation on Argon",
      "----------------------------",
      "",
      "Run these commands from an Argon login node:",
      "",
      "   cd ~/wineinger-nhg/PROJECTS/" + folder,
      "   bash " + base + "-submit-gromacs-prep.sh",
      "   qstat",
      "   tail -f logs/gromacs-prep.log",
      "",
      "Press Ctrl+C to stop watching the log without stopping the submitted job.",
      "",
      "When preparation finishes, confirm the production input exists:",
      "",
      "   ls -lh inputs/production.tpr",
      "",
      "If an older exported job reports that a posre_*.itp topology include is missing:",
      "",
      "   mv posre*.itp build/",
      "   bash " + base + "-submit-gromacs-prep.sh",
      "",
      "If grompp reports pressure coupling with absolute position restraints:",
      "",
      "   echo \"refcoord_scaling = all\" >> npt.mdp",
      "   bash " + base + "-submit-gromacs-prep.sh",
      "",
      "Submit GPU production on Argon",
      "------------------------------",
      "",
      "   bash " + base + "-submit-gromacs-production.sh",
      "   qstat",
      "   tail -f logs/gromacs-production.log",
      "",
      "Run post-production analysis on Argon",
      "-------------------------------------",
      "",
      "After outputs/production.xtc exists:",
      "",
      "   bash " + base + "-submit-gromacs-analysis.sh",
      "   qstat",
      "   tail -f logs/gromacs-analysis.log",
      "   cat analysis/ANALYSIS-SUMMARY.txt",
      "",
      "The analysis folder contains .xvg plots for RMSD, RMSF, radius of gyration, periodic-image distance, and interface metrics when exactly two protein chains are available.",
      "",
      "Movie cleanup pipeline used by Wineinger NHG",
      "--------------------------------------",
      "",
      "The analysis job builds the movie trajectory in this order:",
      "",
      "   outputs/production.xtc",
      "   analysis/production-whole.xtc",
      "   analysis/production-nojump.xtc",
      "   analysis/production-centered.xtc",
      "   analysis/production-protein-only.xtc",
      "",
      "The final movie trajectory is protein-only and backbone-fitted with GROMACS trjconv -fit rot+trans.",
      "",
      "For movie viewing, load these files together in VMD or another trajectory viewer:",
      "",
      "   analysis/production-protein-only.gro",
      "   analysis/production-protein-only.xtc",
      "",
      "Use the protein-only movie files instead of raw outputs/production.xtc when the full system appears to jump, flip, or wrap through the periodic box.",
      "",
      "After confirming the movie looks correct, keep production-protein-only.gro and production-protein-only.xtc. The whole, nojump, and centered .xtc files are intermediate cleanup files.",
      "",
      "Organize an older folder without submitting a job:",
      "",
      "   bash " + base + "-organize-gromacs-folder.sh",
      "",
      "Safe cleanup after qstat confirms no related job is running:",
      "",
      "   rm -f \\#mdout.mdp.*\\# logs/\\#mdout.mdp.*\\#",
      "",
      "Keep selected-complex.pdb, the .mdp files, the .sge.job files, build/, inputs/, logs/, and outputs/ unless you intentionally want to restart or discard results.",
      "",
      "Copy completed production outputs back to Wineinger NHG",
      "-------------------------------------------------",
      "",
      "Run ONE of these commands from Windows PowerShell.",
      "",
      "On campus or connected through the UI VPN:",
      "",
      "   scp -r \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/" + folder + "/outputs\" \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\"",
      "",
      "Off campus without the UI VPN:",
      "",
      "   scp -P 40 -r \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/" + folder + "/outputs\" \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\"",
      "",
      "If post-run analysis was generated, copy it back too:",
      "",
      "   scp -r \"<HAWKID>@argon.hpc.uiowa.edu:~/wineinger-nhg/PROJECTS/" + folder + "/analysis\" \"C:\\Users\\User\\Documents\\wineinger-nhg\\projects\\" + folder + "\"",
      "",
      "For off-campus access without the UI VPN, add -P 40 immediately after scp.",
      ""
    ].join("\n");
  }

  function exportGromacsPreparation() {
    var project = currentProject();
    var results = project.results;
    var candidateId = results && results.selectedId;
    var selectedFile = candidateId && resultFileCache[project.id] && resultFileCache[project.id][candidateId];
    if (!results || !results.selectedComplex) {
      return;
    }
    if (!selectedFile) {
      refs.gromacsPrepStatus.textContent = "Re-import the outputs folder in this app session, click Use for MD again, then export preparation files.";
      return;
    }
    readResultFileText(selectedFile).then(function (pdbText) {
      var mdpFiles = gromacsMdpFiles(project);
      var base = projectSlug(project) || "wineinger-nhg";
      var files = [
        { name: "selected-complex.pdb", contents: pdbText },
        { name: base + "-gromacs-prep.sge.job", contents: gromacsPreparationScript(project) },
        { name: base + "-gromacs-production.sge.job", contents: sgeScript(project) },
        { name: base + "-organize-gromacs-folder.sh", contents: gromacsOrganizeScript(project) },
        { name: base + "-submit-gromacs-prep.sh", contents: gromacsSubmitScript(project, "prep") },
        { name: base + "-submit-gromacs-production.sh", contents: gromacsSubmitScript(project, "production") },
        { name: base + "-run-gromacs-analysis.sh", contents: gromacsAnalysisScript() },
        { name: base + "-gromacs-analysis.sge.job", contents: gromacsAnalysisSgeScript(project) },
        { name: base + "-submit-gromacs-analysis.sh", contents: gromacsSubmitScript(project, "analysis") },
        { name: "ions.mdp", contents: mdpFiles["ions.mdp"] },
        { name: "minim.mdp", contents: mdpFiles["minim.mdp"] },
        { name: "nvt.mdp", contents: mdpFiles["nvt.mdp"] },
        { name: "npt.mdp", contents: mdpFiles["npt.mdp"] },
        { name: "production.mdp", contents: mdpFiles["production.mdp"] },
        { name: "ARGON-GROMACS-INSTRUCTIONS.txt", contents: gromacsArgonInstructions(project) }
      ];
      if (window.ezDesktop && window.ezDesktop.writeProjectExport) {
        refs.exportGromacsPrepButton.disabled = true;
        window.ezDesktop.writeProjectExport({
          folderName: gromacsPreparationFolderName(project),
          localRoot: project.workspace && project.workspace.localPath,
          files: files
        }).then(function (result) {
          project.results.preparation.status = "exported";
          touchProject();
          refs.gromacsPrepStatus.textContent = "Exported preparation bundle to " + result.folderPath + ".";
        }).catch(function (error) {
          refs.gromacsPrepStatus.textContent = error.message || "Unable to export GROMACS preparation.";
        }).finally(function () {
          refs.exportGromacsPrepButton.disabled = false;
        });
        return;
      }
      files.forEach(function (file) {
        downloadText(file.name, file.contents, "text/plain");
      });
      refs.gromacsPrepStatus.textContent = "Downloaded GROMACS preparation files.";
    }).catch(function (error) {
      refs.gromacsPrepStatus.textContent = error.message || "Unable to read the selected HADDOCK3 complex.";
    });
  }

  function sgeScript(project) {
    var execution = project.execution;
    var name = shellValue(projectSlug(project)).slice(0, 48) || "wineinger-nhg_md";
    var usesGpu = execution.gpu && execution.gpuSupport === "enabled";
    var requestedQueue = execution.queue === "UI-GPU" && !usesGpu ? "" : execution.queue;
    var queueLine = requestedQueue ? "#$ -q " + shellValue(requestedQueue) : "# No dedicated GPU queue requested.";
    var gpuLine = usesGpu ? "#$ -l ngpus=1" : "# CPU-only allocation; a GPU-enabled GROMACS build has not been selected.";
    var gmx = shellValue(execution.command || "gmx");
    var gmxCommand = usesGpu ?
      gmx + " mdrun -deffnm outputs/production -s inputs/production.tpr -ntmpi 1 -ntomp ${NSLOTS} -nb gpu" :
      gmx + " mdrun -deffnm outputs/production -s inputs/production.tpr -ntmpi 1 -ntomp ${NSLOTS}";
    return [
      "#!/usr/bin/env bash",
      "# Generated by Wineinger NHG for the University of Iowa Argon SGE scheduler.",
      "# Verified Argon profile: GROMACS 2016.3 via gmx with CUDA support.",
      "#$ -S /bin/bash",
      "#$ -N " + name,
      "#$ -cwd",
      "#$ -j y",
      "#$ -o logs/gromacs-production.log",
      "#$ -l h_rt=" + shellValue(execution.walltime || "24:00:00"),
      "#$ -pe smp " + Number(execution.cpus || 8),
      queueLine,
      gpuLine,
      "",
      "set -euo pipefail",
      "cd \"${SGE_O_WORKDIR:-$(pwd -P)}\"",
      "mkdir -p logs outputs",
      "export OMP_NUM_THREADS=\"${NSLOTS:-1}\"",
      "module purge",
      execution.prerequisiteModule ? "module load " + shellValue(execution.prerequisiteModule) : "# No prerequisite module configured.",
      "module load " + shellValue(execution.module || "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5"),
      "",
      "if [[ ! -f inputs/production.tpr ]]; then",
      "  echo \"Missing inputs/production.tpr. Run structure preparation before submitting.\" >&2",
      "  exit 2",
      "fi",
      "",
      gmx + " --version",
      gmxCommand,
      "",
      "echo \"GROMACS production run complete.\""
    ].join("\n") + "\n";
  }

  function exportSgeScript() {
    var project = currentProject();
    downloadText(projectSlug(project) + "-gromacs.sge.job", sgeScript(project), "text/x-shellscript");
  }

  function exportHaddockFiles() {
    var project = currentProject();
    if (!canExportHaddock(project)) {
      return;
    }
    var base = projectSlug(project) || "wineinger-nhg";
    var files;
    try {
      files = [
        { name: base + "-haddock3.cfg", contents: haddockConfig(project), mimeType: "text/plain" },
        { name: base + "-stage-haddock-inputs.sh", contents: haddockStageScript(project), mimeType: "text/x-shellscript" },
        { name: base + "-haddock3.sge.job", contents: haddockSgeScript(project), mimeType: "text/x-shellscript" },
        { name: base + "-submit-haddock-campaign.sh", contents: haddockCampaignSubmitScript(project), mimeType: "text/x-shellscript" },
        { name: colabfoldName(project) + ".fasta", contents: colabfoldFasta(project), mimeType: "text/plain" },
        { name: "LOCAL-COLABFOLD-SEQUENCES.txt", contents: colabfoldSequenceText(project), mimeType: "text/plain" },
        { name: "ARGON-HADDOCK3-INSTRUCTIONS.txt", contents: haddockArgonInstructions(project), mimeType: "text/plain" }
      ];
    } catch (error) {
      refs.interactionStatus.textContent = error.message || "Unable to prepare the Argon docking files.";
      refs.interactionStatus.classList.remove("ready");
      return;
    }
    if (haddockUsesAmbiguousRestraints(project)) {
      files.push(
        { name: "receptor.actpass", contents: haddockActpassFile(project, "receptor"), mimeType: "text/plain" },
        { name: "partner.actpass", contents: haddockActpassFile(project, "partner"), mimeType: "text/plain" }
      );
    }
    if (window.ezDesktop && window.ezDesktop.writeProjectExport) {
      refs.exportHaddockButton.disabled = true;
      window.ezDesktop.writeProjectExport({
        folderName: haddockFolderName(project),
        localRoot: project.workspace && project.workspace.localPath,
        files: files
      }).then(function (result) {
        refs.interactionStatus.textContent = "Exported Argon docking files to " + result.folderPath + ".";
        refs.interactionStatus.classList.add("ready");
      }).catch(function (error) {
        refs.interactionStatus.textContent = error.message || "Unable to write the Argon docking files.";
        refs.interactionStatus.classList.remove("ready");
      }).finally(function () {
        refs.exportHaddockButton.disabled = false;
      });
      return;
    }
    files.forEach(function (file) {
      downloadText(file.name, file.contents, file.mimeType);
    });
  }

  function createRunPlan() {
    var project = currentProject();
    var enabledSteps = project.workflow.steps.filter(function (step) { return step.enabled; });
    project.runs.push({
      id: uid(),
      label: project.workflow.preset === "docking" ? "Docking plan" : project.workflow.preset === "refinement" ? "Refinement plan" : "Stability plan",
      steps: enabledSteps.length,
      state: project.execution.enabled ? "Ready for staging" : "Awaiting engines",
      created: new Date().toISOString(),
      manifest: runManifest(project)
    });
    project.status = "Plan ready";
    touchProject();
    refs.projectStatus.textContent = project.status;
    renderRuns();
  }

  function demoPdb() {
    return [
      "ATOM      1  CA  GLY A   1      -8.000  -1.000   0.000  1.00 20.00           C",
      "ATOM      2  CA  ALA A   2      -6.300   1.600   1.400  1.00 20.00           C",
      "ATOM      3  CA  SER A   3      -3.100   2.500   0.300  1.00 20.00           C",
      "ATOM      4  CA  TYR A   4      -1.000   0.500  -1.900  1.00 20.00           C",
      "ATOM      5  CA  LEU A   5      -1.800  -2.900  -1.000  1.00 20.00           C",
      "ATOM      6  CA  GLU A   6       1.200  -4.000   0.900  1.00 20.00           C",
      "ATOM      7  CA  VAL A   7       3.500  -1.900   2.600  1.00 20.00           C",
      "ATOM      8  CA  ASP A   8       2.300   1.400   1.800  1.00 20.00           C",
      "ATOM      9  CA  ILE A   9       4.500   3.700  -0.100  1.00 20.00           C",
      "ATOM     10  CA  ASN A  10       7.200   1.600  -1.300  1.00 20.00           C",
      "ATOM     11  CA  GLY A  11       6.200  -1.600  -0.500  1.00 20.00           C",
      "ATOM     12  CA  LYS A  12       7.800  -3.700   1.700  1.00 20.00           C"
    ].join("\n");
  }

  function demoSdf() {
    return [
      "Aspirin demo",
      "Wineinger NHG",
      "",
      "  9  9  0  0  0  0            999 V2000",
      "   -1.4000    0.0000    0.0000 C   0  0  0  0  0  0",
      "   -0.7000    1.2100    0.0000 C   0  0  0  0  0  0",
      "    0.7000    1.2100    0.0000 C   0  0  0  0  0  0",
      "    1.4000    0.0000    0.0000 C   0  0  0  0  0  0",
      "    0.7000   -1.2100    0.0000 C   0  0  0  0  0  0",
      "   -0.7000   -1.2100    0.0000 C   0  0  0  0  0  0",
      "    2.8000    0.0000    0.0000 O   0  0  0  0  0  0",
      "   -2.8000    0.0000    0.0000 C   0  0  0  0  0  0",
      "   -3.5000    1.2100    0.0000 O   0  0  0  0  0  0",
      "  1  2  1  0  0  0  0",
      "  2  3  2  0  0  0  0",
      "  3  4  1  0  0  0  0",
      "  4  5  2  0  0  0  0",
      "  5  6  1  0  0  0  0",
      "  6  1  2  0  0  0  0",
      "  4  7  1  0  0  0  0",
      "  1  8  1  0  0  0  0",
      "  8  9  2  0  0  0  0",
      "M  END"
    ].join("\n");
  }

  function loadDemo() {
    var project = currentProject();
    var ligand = parseSdf(demoSdf());
    project.name = "COX-2 inhibitor screen";
    project.system.components = [];
    project.interaction = defaultInteraction();
    project.results = defaultResults();
    addProteinComponent({
      id: uid(),
      label: "COX-2 demonstration pocket",
      source: "demo",
      sourceId: "3LN1",
      sourceUrl: "https://files.rcsb.org/download/3LN1.pdb",
      pdbText: demoPdb(),
      atoms: parsePdb(demoPdb()),
      metadata: { title: "COX-2 demonstration pocket", chains: ["A"], chainDetails: [{ id: "A", type: "Protein", residues: 12, atoms: 12 }], ligands: ["CEL", "HEM"], resolution: "2.40" },
      visible: true
    });
    project.assets.ligand = { name: "aspirin-demo.sdf", atoms: ligand.atoms, bonds: ligand.bonds };
    project.assets.smiles = "CC(=O)OC1=CC=CC=C1C(=O)O";
    project.workflow.preset = "refinement";
    project.workflow.steps = cloneSteps("refinement");
    project.execution = Object.assign(defaultExecution(), {
      enabled: true,
      queue: "UI-GPU",
      prerequisiteModule: "stack/legacy",
      module: "gromacs/2016.3_cuda-8.0.61_openmpi-2.1.2_gcc-4.8.5",
      command: "gmx",
      engineVersion: "2016.3",
      acceleration: "CUDA",
      walltime: "24:00:00",
      cpus: 8,
      gpu: true,
      gpuSupport: "enabled"
    });
    project.status = "Configured";
    touchProject();
    render();
    refs.pdbId.value = "3LN1";
    refs.pdbStatus.textContent = "Import PDB 3LN1 to replace the sample view with the official COX-2/celecoxib structure.";
  }

  refs.newProject.addEventListener("click", function () {
    var name = window.prompt("Project name", "New discovery study") || "New discovery study";
    var project = newProject(name.trim() || "New discovery study");
    var defaults = defaultWorkspaceProfile(project.name);
    var localPath = window.prompt("Local project path", defaults.localPath);
    var remotePath = window.prompt("Argon project path", defaults.remotePath);
    project.workspace.localPath = (localPath || defaults.localPath).trim();
    project.workspace.remotePath = (remotePath || defaults.remotePath).trim();
    state.projects.unshift(project);
    state.currentProjectId = project.id;
    saveState();
    render();
  });
  refs.workflowTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setWorkflowStep(tab.dataset.workflowStep);
    });
  });
  refs.projectName.addEventListener("change", function () {
    currentProject().name = refs.projectName.value.trim() || "Untitled study";
    touchProject();
    renderProjects();
  });
  [
    { ref: refs.workspaceLocalPath, key: "localPath" },
    { ref: refs.workspaceArgonHost, key: "host" },
    { ref: refs.workspaceArgonPath, key: "remotePath" }
  ].forEach(function (field) {
    field.ref.addEventListener("change", function () {
      currentProject().workspace[field.key] = field.ref.value.trim();
      touchProject();
      renderProjects();
    });
  });
  refs.workspaceArgonPort.addEventListener("change", function () {
    currentProject().workspace.port = Number(refs.workspaceArgonPort.value || 22);
    touchProject();
  });
  refs.syncPush.addEventListener("click", function () {
    runWorkspaceSync("push-project");
  });
  refs.syncPull.addEventListener("click", function () {
    runWorkspaceSync("pull-project");
  });
  refs.loadDemo.addEventListener("click", loadDemo);
  refs.fetchPdb.addEventListener("click", fetchRcsbStructure);
  refs.pdbId.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      fetchRcsbStructure();
    }
  });
  refs.interactionReceptor.addEventListener("change", function () {
    currentProject().interaction.receptorId = refs.interactionReceptor.value || null;
    syncInteractionChains(currentProject());
    touchProject();
    renderInteraction();
  });
  refs.interactionPartner.addEventListener("change", function () {
    currentProject().interaction.partnerId = refs.interactionPartner.value || null;
    syncInteractionChains(currentProject());
    touchProject();
    renderInteraction();
  });
  refs.interactionGuidance.addEventListener("change", function () {
    currentProject().interaction.guidance = refs.interactionGuidance.value;
    touchProject();
    renderInteraction();
  });
  refs.receptorRestraints.addEventListener("input", function () {
    currentProject().interaction.receptorRestraints = refs.receptorRestraints.value;
    touchProject();
    renderInteraction();
  });
  refs.partnerRestraints.addEventListener("input", function () {
    currentProject().interaction.partnerRestraints = refs.partnerRestraints.value;
    touchProject();
    renderInteraction();
  });
  refs.interactionReceptorChain.addEventListener("change", function () {
    currentProject().interaction.receptorChain = refs.interactionReceptorChain.value || null;
    touchProject();
    renderInteraction();
  });
  refs.interactionPartnerChain.addEventListener("change", function () {
    currentProject().interaction.partnerChain = refs.interactionPartnerChain.value || null;
    touchProject();
    renderInteraction();
  });
  refs.interactionMethods.forEach(function (button) {
    button.addEventListener("click", function () {
      currentProject().interaction.method = button.dataset.method;
      updateInteractionWorkflowStep();
      touchProject();
      renderInteraction();
      renderWorkflow();
    });
  });
  refs.exportButton.addEventListener("click", exportManifest);
  refs.exportScriptButton.addEventListener("click", exportSgeScript);
  refs.exportHaddockButton.addEventListener("click", exportHaddockFiles);
  refs.inferInterfaceButton.addEventListener("click", inferInterfaceRestraints);
  refs.openColabfoldButton.addEventListener("click", openLocalColabfold);
  refs.exportColabfoldButton.addEventListener("click", exportColabfoldFiles);
  refs.openCustomColabfoldButton.addEventListener("click", openCustomProteinColabfold);
  refs.exportCustomColabfoldButton.addEventListener("click", exportCustomProteinFiles);
  refs.resultsDirectory.addEventListener("change", function (event) {
    readResultsDirectory(event.target.files);
  });
  refs.colabfoldDirectory.addEventListener("change", function (event) {
    importColabfoldResults(event.target.files);
  });
  refs.customColabfoldDirectory.addEventListener("change", function (event) {
    importCustomProteinResults(event.target.files);
  });
  refs.analysisDirectory.addEventListener("change", function (event) {
    readAnalysisDirectory(event.target.files);
  });
  [
    { ref: refs.prepForceField, key: "forceField" },
    { ref: refs.prepWaterModel, key: "waterModel" },
    { ref: refs.prepBoxShape, key: "boxShape" },
    { ref: refs.prepPadding, key: "paddingNanometers", numeric: true },
    { ref: refs.prepSalt, key: "saltMolar", numeric: true },
    { ref: refs.prepTemperature, key: "temperatureKelvin", numeric: true }
  ].forEach(function (field) {
    field.ref.addEventListener("change", function () {
      currentProject().results.preparation[field.key] = field.numeric ? Number(field.ref.value) : field.ref.value;
      currentProject().results.preparation.status = "configured";
      touchProject();
    });
  });
  refs.exportGromacsPrepButton.addEventListener("click", exportGromacsPreparation);
  refs.createRun.addEventListener("click", createRunPlan);
  refs.receptorFile.addEventListener("change", function (event) {
    readStructureFile(event.target.files[0], "receptor");
  });
  refs.customProteinName.addEventListener("input", function () {
    currentProject().proteinBuilder.name = refs.customProteinName.value.trim();
    touchProject();
    refs.exportCustomColabfoldButton.disabled = !canExportCustomProtein(currentProject());
    refs.openCustomColabfoldButton.disabled = !canExportCustomProtein(currentProject());
  });
  refs.customProteinSequence.addEventListener("input", function () {
    currentProject().proteinBuilder.sequence = normalizedProteinSequence(refs.customProteinSequence.value);
    touchProject();
    refs.exportCustomColabfoldButton.disabled = !canExportCustomProtein(currentProject());
    refs.openCustomColabfoldButton.disabled = !canExportCustomProtein(currentProject());
  });
  refs.ligandFile.addEventListener("change", function (event) {
    readStructureFile(event.target.files[0], "ligand");
  });
  refs.removeLigand.addEventListener("click", function () {
    currentProject().assets.ligand = null;
    refs.ligandFile.value = "";
    touchProject();
    renderAssets();
  });
  refs.smiles.addEventListener("change", function () {
    currentProject().assets.smiles = refs.smiles.value.trim();
    touchProject();
    renderAssets();
  });
  refs.preset.addEventListener("change", function () {
    var project = currentProject();
    project.workflow.preset = refs.preset.value;
    project.workflow.steps = cloneSteps(refs.preset.value);
    if (!project.workflow.steps.some(function (step) { return step.engine === "GROMACS"; })) {
      project.execution.enabled = false;
    }
    touchProject();
    renderWorkflow();
  });
  [
    { ref: refs.ph, key: "ph" },
    { ref: refs.poses, key: "poses" },
    { ref: refs.md, key: "mdNanoseconds" }
  ].forEach(function (setting) {
    setting.ref.addEventListener("change", function () {
      currentProject().workflow.settings[setting.key] = Number(setting.ref.value);
      touchProject();
    });
  });
  refs.clusterEnabled.addEventListener("change", function () {
    currentProject().execution.enabled = refs.clusterEnabled.checked;
    touchProject();
    renderExecution();
  });
  [
    { ref: refs.clusterHost, key: "sshHost" },
    { ref: refs.clusterPort, key: "sshPort", numeric: true },
    { ref: refs.clusterQueue, key: "queue" },
    { ref: refs.clusterPrerequisite, key: "prerequisiteModule" },
    { ref: refs.clusterModule, key: "module" },
    { ref: refs.clusterCommand, key: "command" },
    { ref: refs.clusterGpuSupport, key: "gpuSupport" },
    { ref: refs.clusterTime, key: "walltime" },
    { ref: refs.clusterCpus, key: "cpus", numeric: true }
  ].forEach(function (field) {
    field.ref.addEventListener("change", function () {
      currentProject().execution[field.key] = field.numeric ? Number(field.ref.value) : field.ref.value.trim();
      touchProject();
    });
  });
  refs.clusterGpu.addEventListener("change", function () {
    currentProject().execution.gpu = refs.clusterGpu.checked;
    touchProject();
  });
  refs.clusterGpuSupport.addEventListener("change", function () {
    if (refs.clusterGpuSupport.value !== "enabled") {
      currentProject().execution.gpu = false;
      if (currentProject().execution.queue === "UI-GPU") {
        currentProject().execution.queue = "";
      }
    } else if (refs.clusterGpuSupport.value === "enabled" && !currentProject().execution.queue) {
      currentProject().execution.queue = "UI-GPU";
    }
    touchProject();
    renderExecution();
  });
  refs.toggleReceptor.addEventListener("click", function () {
    renderState.receptorVisible = !renderState.receptorVisible;
    refs.toggleReceptor.classList.toggle("active", renderState.receptorVisible);
    drawStructure();
  });
  refs.toggleLigand.addEventListener("click", function () {
    renderState.ligandVisible = !renderState.ligandVisible;
    refs.toggleLigand.classList.toggle("active", renderState.ligandVisible);
    drawStructure();
  });
  refs.viewerStyle.addEventListener("change", function () {
    viewerSettings.style = refs.viewerStyle.value;
    drawStructure();
    drawDockedStructure();
  });
  refs.viewerColor.addEventListener("change", function () {
    viewerSettings.color = refs.viewerColor.value;
    drawStructure();
    drawDockedStructure();
  });
  refs.viewerQuality.addEventListener("change", function () {
    viewerSettings.quality = refs.viewerQuality.value;
    drawStructure();
    drawDockedStructure();
  });
  refs.viewerShowHetero.addEventListener("change", function () {
    viewerSettings.showHetero = refs.viewerShowHetero.checked;
    drawStructure();
    drawDockedStructure();
  });
  refs.viewerReset.addEventListener("click", function () {
    if (structureViewer.stage) {
      structureViewer.stage.autoView();
      resizeStructureViewer();
    }
  });
  refs.dockViewerReset.addEventListener("click", function () {
    if (dockViewer.stage) {
      dockViewer.stage.autoView();
      resizeDockViewer();
    }
  });
  window.addEventListener("resize", function () {
    resizeStructureViewer();
    resizeDockViewer();
    drawAnalysisPlot((currentProject().analysis || defaultAnalysis()).plots.find(function (plot) {
      return plot.id === currentProject().analysis.selectedPlotId;
    }) || null);
  });

  render();
  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    loadDemo();
  }
}());



