<script setup lang="ts">
import type { Project, EnvKey } from "~/shared/types";

const { data, refresh, pending } = await useFetch("/api/projects");
const projects = computed<Project[]>(() => data.value?.projects ?? []);

const selectedProjectId = ref("");
const selectedEnv = ref<EnvKey>("local");
const selectedFile = ref("");

const content = ref("");
const warnings = ref<string[]>([]);
const workspaceExists = ref(false);
const source = ref("");
const path = ref("");
const status = reactive({ loading: false, saving: false, syncing: false, diffing: false });
const errorMsg = ref("");
const diffParts = ref<any[]>([]);
const showDiff = ref(false);

const selectedProject = computed<Project | null>(() => {
  return projects.value.find((item) => item.id === selectedProjectId.value) ?? null;
});

const envConfig = computed(() => selectedProject.value?.envs?.[selectedEnv.value] ?? null);
const files = computed(() => envConfig.value?.files ?? []);

const projectFormMode = ref<"view" | "create" | "edit">("view");
const projectForm = reactive({
  id: "",
  name: "",
  notes: "",
  envs: {
    local: { basePath: "", files: "" },
    campus: { hostAlias: "", basePath: "", files: "" },
    aliyun: { hostAlias: "", basePath: "", files: "" }
  }
});

function selectProject(projectId: string) {
  selectedProjectId.value = projectId;
  projectFormMode.value = "view";
  fillProjectForm();
}

function formatFiles(list?: string[]) {
  return (list ?? []).join("\n");
}

function parseFiles(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillProjectForm() {
  const project = selectedProject.value;
  if (!project) {
    return;
  }
  projectForm.id = project.id;
  projectForm.name = project.name;
  projectForm.notes = project.notes ?? "";
  projectForm.envs.local.basePath = project.envs.local.basePath;
  projectForm.envs.local.files = formatFiles(project.envs.local.files);
  projectForm.envs.campus.hostAlias = project.envs.campus.hostAlias ?? "";
  projectForm.envs.campus.basePath = project.envs.campus.basePath;
  projectForm.envs.campus.files = formatFiles(project.envs.campus.files);
  projectForm.envs.aliyun.hostAlias = project.envs.aliyun.hostAlias ?? "";
  projectForm.envs.aliyun.basePath = project.envs.aliyun.basePath;
  projectForm.envs.aliyun.files = formatFiles(project.envs.aliyun.files);
}

function startCreateProject() {
  projectFormMode.value = "create";
  projectForm.id = "";
  projectForm.name = "";
  projectForm.notes = "";
  projectForm.envs.local.basePath = "";
  projectForm.envs.local.files = "";
  projectForm.envs.campus.hostAlias = "";
  projectForm.envs.campus.basePath = "";
  projectForm.envs.campus.files = "";
  projectForm.envs.aliyun.hostAlias = "";
  projectForm.envs.aliyun.basePath = "";
  projectForm.envs.aliyun.files = "";
}

function startEditProject() {
  if (!selectedProject.value) return;
  projectFormMode.value = "edit";
  fillProjectForm();
}

async function saveProject() {
  const payload = {
    name: projectForm.name,
    notes: projectForm.notes,
    envs: {
      local: {
        basePath: projectForm.envs.local.basePath,
        files: parseFiles(projectForm.envs.local.files)
      },
      campus: {
        hostAlias: projectForm.envs.campus.hostAlias || undefined,
        basePath: projectForm.envs.campus.basePath,
        files: parseFiles(projectForm.envs.campus.files)
      },
      aliyun: {
        hostAlias: projectForm.envs.aliyun.hostAlias || undefined,
        basePath: projectForm.envs.aliyun.basePath,
        files: parseFiles(projectForm.envs.aliyun.files)
      }
    }
  };

  try {
    if (projectFormMode.value === "create") {
      const created = await $fetch<Project>("/api/projects", { method: "POST", body: payload });
      await refresh();
      selectProject(created.id);
    } else if (projectFormMode.value === "edit" && projectForm.id) {
      await $fetch(`/api/projects/${projectForm.id}`, { method: "PUT", body: payload });
      await refresh();
      selectProject(projectForm.id);
    }
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "Project save failed";
  }
}

async function deleteProject() {
  if (!projectForm.id) return;
  if (!confirm("Delete this project?")) return;
  await $fetch(`/api/projects/${projectForm.id}`, { method: "DELETE" });
  await refresh();
  selectedProjectId.value = projects.value[0]?.id ?? "";
  fillProjectForm();
}

watch(projects, () => {
  if (!selectedProjectId.value && projects.value.length) {
    selectedProjectId.value = projects.value[0].id;
    fillProjectForm();
  }
});

watch([selectedProjectId, selectedEnv], () => {
  const list = files.value;
  if (!list.includes(selectedFile.value)) {
    selectedFile.value = list[0] ?? "";
  }
});

watch(selectedFile, () => {
  if (selectedProjectId.value && selectedFile.value) {
    loadFile();
  }
});

async function loadFile() {
  status.loading = true;
  errorMsg.value = "";
  try {
    const res: any = await $fetch("/api/env", {
      query: {
        projectId: selectedProjectId.value,
        env: selectedEnv.value,
        file: selectedFile.value
      }
    });
    warnings.value = res.warnings ?? [];
    workspaceExists.value = Boolean(res.workspace?.exists);
    if (workspaceExists.value) {
      content.value = res.workspace.content || "";
      source.value = "workspace";
    } else {
      content.value = res.content || "";
      source.value = res.source || "";
    }
    path.value = res.path || "";
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "Load failed";
  } finally {
    status.loading = false;
  }
}

async function saveEnv() {
  if (!selectedProjectId.value || !selectedFile.value) return;
  status.saving = true;
  errorMsg.value = "";
  try {
    const res: any = await $fetch("/api/env", {
      method: "PUT",
      query: {
        projectId: selectedProjectId.value,
        env: selectedEnv.value,
        file: selectedFile.value
      },
      body: { content: content.value }
    });
    warnings.value = res.warnings ?? [];
    workspaceExists.value = true;
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "Save failed";
  } finally {
    status.saving = false;
  }
}

async function syncEnv() {
  if (!selectedProjectId.value || !selectedFile.value || selectedEnv.value === "local") return;
  status.syncing = true;
  errorMsg.value = "";
  try {
    await $fetch("/api/sync", {
      method: "POST",
      body: {
        projectId: selectedProjectId.value,
        env: selectedEnv.value,
        file: selectedFile.value
      }
    });
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "Sync failed";
  } finally {
    status.syncing = false;
  }
}

async function loadDiff() {
  if (!selectedProjectId.value || !selectedFile.value) return;
  status.diffing = true;
  errorMsg.value = "";
  try {
    const res: any = await $fetch("/api/diff", {
      query: {
        projectId: selectedProjectId.value,
        env: selectedEnv.value,
        file: selectedFile.value
      }
    });
    diffParts.value = res.diff ?? [];
    showDiff.value = true;
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "Diff failed";
  } finally {
    status.diffing = false;
  }
}

const envTabs: { key: EnvKey; label: string }[] = [
  { key: "local", label: "Local" },
  { key: "campus", label: "Campus" },
  { key: "aliyun", label: "Aliyun" }
];
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">EnvMgr</div>
        <div class="brand-sub">multi-env dashboard</div>
      </div>
      <button class="primary" @click="startCreateProject">+ New Project</button>
      <button class="ghost" @click="refresh" :disabled="pending">Refresh</button>
      <div class="project-list">
        <button
          v-for="project in projects"
          :key="project.id"
          class="project-item"
          :class="{ active: project.id === selectedProjectId }"
          @click="selectProject(project.id)"
        >
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">local / campus / aliyun</div>
        </button>
        <div v-if="projects.length === 0" class="empty">No projects</div>
      </div>
    </aside>

    <main class="main">
      <section class="toolbar">
        <div class="tabs">
          <button
            v-for="tab in envTabs"
            :key="tab.key"
            class="tab"
            :class="{ active: selectedEnv === tab.key }"
            @click="selectedEnv = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="toolbar-actions">
          <select v-model="selectedFile" class="file-select">
            <option value="" disabled>Select file</option>
            <option v-for="file in files" :key="file" :value="file">{{ file }}</option>
          </select>
          <button class="ghost" @click="loadFile" :disabled="status.loading">Reload</button>
          <button class="primary" @click="saveEnv" :disabled="status.saving">Save</button>
          <button class="accent" @click="syncEnv" :disabled="selectedEnv === 'local' || status.syncing">Sync Remote</button>
          <button class="ghost" @click="loadDiff" :disabled="status.diffing">Diff</button>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-header">
          <div>
            <div class="editor-title">{{ selectedProject?.name || "No project" }}</div>
            <div class="editor-meta">
              <span>Source: {{ source || "-" }}</span>
              <span>Path: {{ path || "-" }}</span>
              <span>Workspace: {{ workspaceExists ? "present" : "none" }}</span>
            </div>
          </div>
          <div class="status">{{ status.loading ? "Loading..." : "" }}</div>
        </div>
        <textarea v-model="content" class="editor" spellcheck="false" />
        <div v-if="warnings.length" class="warnings">
          <div class="warnings-title">Format Warnings</div>
          <ul>
            <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>
        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
      </section>

      <section v-if="showDiff" class="diff-card">
        <div class="diff-header">
          <div class="editor-title">Diff View</div>
          <button class="ghost" @click="showDiff = false">Close</button>
        </div>
        <pre class="diff">
<span
  v-for="(part, index) in diffParts"
  :key="index"
  :class="{ added: part.added, removed: part.removed }"
>{{ part.value }}</span>
        </pre>
      </section>
    </main>

    <aside class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Project Settings</div>
          <div class="panel-sub">Define paths and files</div>
        </div>
        <div class="panel-actions">
          <button v-if="projectFormMode === 'view'" class="ghost" @click="startEditProject">Edit</button>
          <button v-if="projectFormMode !== 'view'" class="primary" @click="saveProject">Save</button>
          <button v-if="projectFormMode !== 'view'" class="ghost" @click="projectFormMode = 'view'">Cancel</button>
        </div>
      </div>

      <div class="panel-body">
        <label class="field">
          <span>Project Name</span>
          <input v-model="projectForm.name" :disabled="projectFormMode === 'view'" />
        </label>
        <label class="field">
          <span>Notes</span>
          <input v-model="projectForm.notes" :disabled="projectFormMode === 'view'" />
        </label>

        <div class="env-block">
          <div class="env-title">Local Env</div>
          <label class="field">
            <span>Base Path</span>
            <input v-model="projectForm.envs.local.basePath" :disabled="projectFormMode === 'view'" placeholder="/path/to/project" />
          </label>
          <label class="field">
            <span>Files (one per line)</span>
            <textarea v-model="projectForm.envs.local.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <div class="env-block">
          <div class="env-title">Campus Server</div>
          <label class="field">
            <span>SSH Alias</span>
            <input v-model="projectForm.envs.campus.hostAlias" :disabled="projectFormMode === 'view'" placeholder="campus-host" />
          </label>
          <label class="field">
            <span>Base Path</span>
            <input v-model="projectForm.envs.campus.basePath" :disabled="projectFormMode === 'view'" placeholder="/srv/project" />
          </label>
          <label class="field">
            <span>Files (one per line)</span>
            <textarea v-model="projectForm.envs.campus.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <div class="env-block">
          <div class="env-title">Aliyun Server</div>
          <label class="field">
            <span>SSH Alias</span>
            <input v-model="projectForm.envs.aliyun.hostAlias" :disabled="projectFormMode === 'view'" placeholder="aliyun-host" />
          </label>
          <label class="field">
            <span>Base Path</span>
            <input v-model="projectForm.envs.aliyun.basePath" :disabled="projectFormMode === 'view'" placeholder="/srv/project" />
          </label>
          <label class="field">
            <span>Files (one per line)</span>
            <textarea v-model="projectForm.envs.aliyun.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <button v-if="projectFormMode === 'edit'" class="danger" @click="deleteProject">Delete Project</button>
      </div>
    </aside>
  </div>
</template>
