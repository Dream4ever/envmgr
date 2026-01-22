<script setup lang="ts">
import type { Project, EnvKey } from "#shared/types";

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
const baseContent = ref("");
const diffHtml = computed(() => {
  return diffParts.value
    .map((part) => {
      const safeText = escapeHtml(String(part.value ?? ""));
      if (part.added) return `<span class="added">${safeText}</span>`;
      if (part.removed) return `<span class="removed">${safeText}</span>`;
      return safeText;
    })
    .join("");
});

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
  if (projectId === selectedProjectId.value) {
    projectFormMode.value = "view";
    fillProjectForm();
    return;
  }
  selectedFile.value = "";
  selectedEnv.value = "local";
  selectedProjectId.value = projectId;
  resetDiffState();
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resetDiffState() {
  showDiff.value = false;
  diffParts.value = [];
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
    errorMsg.value = error?.data?.statusMessage || error?.message || "保存项目失败";
  }
}

async function deleteProject() {
  if (!projectForm.id) return;
  if (!confirm("确定要删除该项目吗？")) return;
  await $fetch(`/api/projects/${projectForm.id}`, { method: "DELETE" });
  await refresh();
  const nextId = projects.value[0]?.id ?? "";
  if (nextId) {
    selectProject(nextId);
  } else {
    selectedProjectId.value = "";
    selectedFile.value = "";
    fillProjectForm();
  }
}

watch(projects, () => {
  if (!selectedProjectId.value && projects.value.length) {
    selectProject(projects.value[0].id);
  }
});

watch([selectedProjectId, selectedEnv], () => {
  resetDiffState();
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
    baseContent.value = content.value;
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "读取失败";
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
    baseContent.value = content.value;
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || error?.message || "保存失败";
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
    errorMsg.value = error?.data?.statusMessage || error?.message || "同步失败";
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
    errorMsg.value = error?.data?.statusMessage || error?.message || "对比失败";
  } finally {
    status.diffing = false;
  }
}

function toggleDiff() {
  if (showDiff.value) {
    showDiff.value = false;
    return;
  }
  loadDiff();
}

const envTabs: { key: EnvKey; label: string }[] = [
  { key: "local", label: "本地" },
  { key: "campus", label: "校内" },
  { key: "aliyun", label: "阿里云" }
];

const sourceLabels: Record<string, string> = {
  local: "本地",
  remote: "远端",
  workspace: "待同步版本"
};

const sourceText = computed(() => sourceLabels[source.value] ?? source.value ?? "-");
const showSyncButton = computed(() => {
  if (status.loading) return false;
  return Boolean(
    selectedProjectId.value &&
      selectedFile.value &&
      selectedEnv.value !== "local" &&
      source.value !== "local" &&
      workspaceExists.value
  );
});
const isDirty = computed(() => content.value !== baseContent.value);
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">EnvMgr</div>
        <div class="brand-sub">多环境管理面板</div>
      </div>
      <button class="primary" @click="startCreateProject">+ 新项目</button>
      <button class="ghost" @click="refresh" :disabled="pending">刷新列表</button>
      <div class="project-list">
        <button
          v-for="project in projects"
          :key="project.id"
          class="project-item"
          :class="{ active: project.id === selectedProjectId }"
          @click="selectProject(project.id)"
        >
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">本地 / 校内 / 阿里云</div>
        </button>
        <div v-if="projects.length === 0" class="empty">暂无项目</div>
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
            <option value="" disabled>选择文件</option>
            <option v-for="file in files" :key="file" :value="file">{{ file }}</option>
          </select>
          <button class="ghost" @click="loadFile" :disabled="status.loading">刷新</button>
          <button class="primary" @click="saveEnv" :disabled="status.saving || !isDirty">保存</button>
          <button
            v-if="showSyncButton"
            class="accent"
            @click="syncEnv"
            :disabled="status.syncing"
          >
            同步到远端
          </button>
          <button class="ghost" @click="toggleDiff" :disabled="status.diffing">
            {{ showDiff ? "取消对比" : "对比" }}
          </button>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-header">
          <div>
            <div class="editor-title">{{ selectedProject?.name || "未选择项目" }}</div>
            <div class="editor-meta">
              <span>来源：{{ sourceText }}</span>
              <span>路径：{{ path || "-" }}</span>
              <span>待同步版本：{{ workspaceExists ? "已存在" : "无" }}</span>
            </div>
          </div>
          <div class="status">{{ status.loading ? "读取中..." : "" }}</div>
        </div>
        <pre v-if="showDiff" class="diff" v-html="diffHtml"></pre>
        <textarea v-else v-model="content" class="editor" spellcheck="false" />
        <div v-if="warnings.length" class="warnings">
          <div class="warnings-title">格式提醒</div>
          <ul>
            <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>
        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
      </section>
    </main>

    <aside class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">项目设置</div>
          <div class="panel-sub">定义环境路径与文件列表</div>
        </div>
        <div class="panel-actions">
          <button v-if="projectFormMode === 'view'" class="ghost" @click="startEditProject">编辑</button>
          <button v-if="projectFormMode !== 'view'" class="primary" @click="saveProject">保存</button>
          <button v-if="projectFormMode !== 'view'" class="ghost" @click="projectFormMode = 'view'">取消</button>
        </div>
      </div>

      <div class="panel-body">
        <label class="field">
          <span>项目名称</span>
          <input v-model="projectForm.name" :disabled="projectFormMode === 'view'" />
        </label>
        <label class="field">
          <span>备注</span>
          <input v-model="projectForm.notes" :disabled="projectFormMode === 'view'" />
        </label>

        <div class="env-block">
          <div class="env-title">本地环境</div>
          <label class="field">
            <span>基础路径</span>
            <input v-model="projectForm.envs.local.basePath" :disabled="projectFormMode === 'view'" placeholder="/path/to/project" />
          </label>
          <label class="field">
            <span>文件列表（每行一个）</span>
            <textarea v-model="projectForm.envs.local.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <div class="env-block">
          <div class="env-title">校内服务器</div>
          <label class="field">
            <span>SSH 别名</span>
            <input v-model="projectForm.envs.campus.hostAlias" :disabled="projectFormMode === 'view'" placeholder="campus-host" />
          </label>
          <label class="field">
            <span>基础路径</span>
            <input v-model="projectForm.envs.campus.basePath" :disabled="projectFormMode === 'view'" placeholder="/srv/project" />
          </label>
          <label class="field">
            <span>文件列表（每行一个）</span>
            <textarea v-model="projectForm.envs.campus.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <div class="env-block">
          <div class="env-title">阿里云服务器</div>
          <label class="field">
            <span>SSH 别名</span>
            <input v-model="projectForm.envs.aliyun.hostAlias" :disabled="projectFormMode === 'view'" placeholder="aliyun-host" />
          </label>
          <label class="field">
            <span>基础路径</span>
            <input v-model="projectForm.envs.aliyun.basePath" :disabled="projectFormMode === 'view'" placeholder="/srv/project" />
          </label>
          <label class="field">
            <span>文件列表（每行一个）</span>
            <textarea v-model="projectForm.envs.aliyun.files" :disabled="projectFormMode === 'view'" />
          </label>
        </div>

        <button v-if="projectFormMode === 'edit'" class="danger" @click="deleteProject">删除项目</button>
      </div>
    </aside>
  </div>
</template>
