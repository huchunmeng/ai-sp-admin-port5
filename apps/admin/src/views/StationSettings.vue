<template>
  <div class="content-container">
    <div style="margin-bottom: 16px;">
      <h1 style="margin-top: 8px; font-size: 1.5rem; font-weight: 600;">考站设置</h1>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:0;">
      <button v-for="ph in phaseTabs" :key="ph.value"
              @click="activePhaseTab = ph.value"
              :style="{ padding:'8px 20px', border:'none', background:'none', cursor:'pointer', fontSize:'14px', fontWeight: activePhaseTab === ph.value ? 600 : 400, color: activePhaseTab === ph.value ? '#409EFF' : '#6b7280', borderBottom: activePhaseTab === ph.value ? '2px solid #409EFF' : '2px solid transparent', marginBottom:'-2px', transition:'all .15s' }">
        {{ ph.label }} ({{ schemes.filter(s => s.phase === ph.value).length }})
      </button>
    </div>

    <div class="card" style="padding: 16px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 13px; color: var(--text-secondary);">方案名称：</label>
          <input type="text" v-model="filterName" placeholder="请输入方案名称" style="padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; width: 160px;">
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 13px; color: var(--text-secondary);">类型：</label>
          <select v-model="filterType" style="padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px;">
            <option value="">全部</option>
            <option value="platform">平台</option>
            <option value="province">省级</option>
            <option value="institution">机构</option>
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 13px; color: var(--text-secondary);">状态：</label>
          <select v-model="filterStatus" style="padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px;">
            <option value="">全部</option>
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="search" style="padding: 4px 12px; font-size: 13px;">
          <i class="fas fa-search" style="margin-right: 4px;"></i>查询
        </button>
        <button class="btn" @click="resetFilter" style="padding: 4px 12px; font-size: 13px;">重置</button>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <span style="font-size: 13px; color: var(--text-secondary);">共 {{ filteredSchemes.length }} 条记录</span>
      <button class="btn btn-primary" @click="openAddModal">
        <i class="fas fa-plus" style="margin-right: 4px;"></i>新增方案
      </button>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 50px;">序号</th>
              <th>方案名称</th>
              <th>类型</th>
              <th>来源</th>
              <th>专业数量</th>
              <th>最近编辑</th>
              <th>操作人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(scheme, index) in pagedSchemes" :key="scheme.id"
                :class="{
                  'bg-green-50': isSchemeEnabled(scheme),
                  'bg-gray-50': scheme.type === 'province' && !isSchemeEnabled(scheme)
                }"
                :style="scheme.type === 'platform' && isSchemeEnabled(scheme) ? {backgroundColor: '#f0fdf4'} : scheme.type === 'province' && !isSchemeEnabled(scheme) ? {backgroundColor: '#f9fafb'} : {}">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <a href="javascript:void(0)" @click="viewScheme(scheme.id)" style="font-size: 13px; font-weight: 500; color: #1e40af; cursor: pointer; text-decoration: none;" :title="'查看 ' + scheme.name">{{ scheme.name }}</a>
                  <span v-if="isSchemeEnabled(scheme)" style="padding: 2px 8px; background: #dcfce7; color: #15803d; border-radius: 4px; font-size: 11px;">启用中</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="{
                  'badge-info': scheme.type === 'platform',
                  'badge-warning': scheme.type === 'province',
                  'badge-error': scheme.type === 'institution'
                }" style="font-size: 11px;">
                  {{ scheme.type === 'platform' ? '平台' : scheme.type === 'province' ? '省级' : '机构' }}
                </span>
              </td>
              <td>{{ scheme.source }}</td>
              <td>{{ scheme.majors.length }}个专业</td>
              <td>2026-04-30 10:00</td>
              <td>管理员</td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="isSchemeEnabled(scheme)" @change="toggleStatus(scheme.id)">
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm" :disabled="scheme.type !== 'institution'" @click="openEditPanel(scheme.id)">编辑</button>
                  <button class="btn btn-sm" @click="copyScheme(scheme.id)">复制</button>
                  <button class="btn btn-sm btn-danger" :disabled="scheme.type !== 'institution'" @click="deleteScheme(scheme.id)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="totalPages > 1" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
      <span style="font-size: 13px; color: var(--text-secondary);">共 {{ filteredSchemes.length }} 条记录</span>
      <div style="display: flex; gap: 8px;">
        <button class="btn" @click="goPage(currentPage - 1)" :disabled="currentPage === 1">上一页</button>
        <button v-for="page in totalPages" :key="page" class="btn" :class="{ 'btn-primary': page === currentPage }" @click="goPage(page)">{{ page }}</button>
        <button class="btn" @click="goPage(currentPage + 1)" :disabled="currentPage === totalPages">下一页</button>
      </div>
    </div>

    <div v-if="showSlidePanel" class="slide-panel open" style="position: fixed; top: 0; right: 0; width: 70%; height: 100%; background: white; box-shadow: -4px 0 20px rgba(0,0,0,0.15); z-index: 1000; display: flex; flex-direction: column;">
      <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">编辑：{{ editingScheme?.name }}</h3>
          <span class="badge" :class="{ 'badge-info': editingScheme?.type === 'platform', 'badge-warning': editingScheme?.type === 'province', 'badge-error': editingScheme?.type === 'institution' }" style="margin-top: 4px;">{{ editingScheme?.type === 'platform' ? '平台' : editingScheme?.type === 'province' ? '省级' : '机构' }}</span>
        </div>
        <button class="btn" @click="closeSlidePanel">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 16px;">
        <div v-if="!editingScheme" style="text-align: center; padding: 20px;">加载中...</div>
        <div v-else>
          <div style="display: flex; align-items: center; gap: 4px; border-bottom: 2px solid var(--border); margin-bottom: 16px; padding-bottom: 0; position: sticky; top: 0; background: white; z-index: 10;">
            <div :style="{ flex: '1', minWidth: 0, overflow: majorsExpanded ? 'visible' : 'hidden', display: 'flex', gap: '4px', flexWrap: majorsExpanded ? 'wrap' : 'nowrap' }">
              <div v-for="(major, midx) in editingScheme.majors" :key="midx"
                   @click="editingMajorTab = midx"
                   :style="{ padding: '10px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: editingMajorTab === midx ? 600 : 400, color: editingMajorTab === midx ? '#409EFF' : 'var(--text-secondary)', borderBottom: editingMajorTab === midx ? '2px solid #409EFF' : '2px solid transparent', marginBottom: '-2px', whiteSpace: 'nowrap', transition: 'all .15s', borderRadius: '6px 6px 0 0' }"
                   @mouseenter="$event.target.style.background = editingMajorTab !== midx ? '#f0f5ff' : 'transparent'"
                   @mouseleave="$event.target.style.background = 'transparent'">
                {{ major.name }}
              </div>
              <button v-if="editingScheme.majors.length > 1" class="btn btn-sm" @click="majorsExpanded = !majorsExpanded" style="margin-bottom: 2px; padding: 2px 8px; font-size: 11px; white-space: nowrap; flex-shrink: 0; color: var(--text-secondary);">
                {{ majorsExpanded ? '收起' : '展开' }}
              </button>
              <button v-if="majorsExpanded" class="btn btn-sm" @click="openAddMajorModal" style="margin-bottom: 2px; padding: 4px 12px; font-size: 12px; white-space: nowrap; flex-shrink: 0;">
                <i class="fas fa-plus" style="margin-right: 4px;"></i>添加
              </button>
            </div>
            <button v-if="editingScheme.majors.length > 1 && !majorsExpanded" class="btn btn-sm" @click="majorsExpanded = !majorsExpanded" style="margin-bottom: 2px; padding: 4px 12px; font-size: 12px; white-space: nowrap; flex-shrink: 0;">
              展开
            </button>
            <button v-if="!majorsExpanded" class="btn btn-sm" @click="openAddMajorModal" style="margin-bottom: 2px; padding: 4px 12px; font-size: 12px; white-space: nowrap; flex-shrink: 0;">
              <i class="fas fa-plus" style="margin-right: 4px;"></i>添加
            </button>
          </div>
          <template v-if="editingScheme.majors.length > 0">
            <div style="border: 1px solid var(--border); border-radius: 8px;">
              <div style="padding: 12px 16px; background: var(--background); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span :style="{ width: '4px', height: '16px', borderRadius: '2px', backgroundColor: editingMajorTab % 2 === 0 ? '#3b82f6' : '#10b981' }"></span>
                  <strong>{{ editingScheme.majors[editingMajorTab]?.name }}专业</strong>
                  <button class="btn btn-sm" @click="toggleAllStations" style="padding: 2px 10px; font-size: 12px;">
                    {{ allStationsCollapsed ? '展开所有考站' : '收起所有考站' }}
                  </button>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-sm" @click="openAddStationModal(editingMajorTab)">+ 添加考站类型</button>
                  <button class="btn btn-sm btn-danger" @click="deleteMajor(editingMajorTab)">删除专业</button>
                </div>
              </div>
              <div v-if="editingScheme.majors[editingMajorTab]?.stations.length === 0" style="padding: 16px; color: var(--text-secondary); text-align: center;">暂无考站</div>
              <div v-for="(station, sindex) in editingScheme.majors[editingMajorTab]?.stations" :key="sindex" draggable="true" @dragstart="stationDragStart($event, editingMajorTab, sindex)" @dragover="stationDragOver" @drop="stationDrop($event, editingMajorTab, sindex)" style="border-bottom: 1px solid var(--border-light); padding: 0;">
                <div style="background: #f9fafb; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-bottom: 1px solid #e5e7eb;" @click="toggleStation(editingMajorTab, sindex)">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-grip-vertical" style="color: #9ca3af; cursor: grab;" @click.stop></i>
                    <i class="fas" :class="station.collapsed ? 'fa-chevron-right' : 'fa-chevron-down'" style="color: var(--text-tertiary);" @click.stop="toggleStation(editingMajorTab, sindex)"></i>
                    <input v-model="station.name" style="font-weight: 600; border: 1px solid transparent; background: transparent; padding: 2px 6px; border-radius: 4px; font-size: 14px; width: 140px;" @click.stop @focus="$event.target.style.border='1px solid #409EFF'; $event.target.style.background='#fff'" @blur="syncStationName(editingMajorTab, sindex); $event.target.style.border='1px solid transparent'; $event.target.style.background='transparent'">
                    <span style="font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;" @click.stop>时长：<input type="number" v-model.number="station.duration" style="width: 60px; padding: 2px 6px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;" min="1" @click.stop /> 分钟</span>

                  </div>
                  <button class="btn btn-sm btn-danger" @click.stop="deleteStation(editingMajorTab, sindex)">删除</button>
                </div>
                <div v-show="!station.collapsed" style="padding: 12px 16px;">
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 500;">考核项目：</span>
                      <button class="btn btn-sm" @click="openProjectModal(editingMajorTab, sindex)">+ 配置考核项目</button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                      <span v-for="(proj, pindex) in station.projects" :key="pindex" draggable="true" @dragstart="projectDragStart($event, editingMajorTab, sindex, pindex)" @dragover="projectDragOver" @drop="projectDrop($event, editingMajorTab, sindex, pindex)" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 13px; cursor: grab;">
                        <i class="fas fa-grip-lines" style="color: #93c5fd;"></i>
                        <span>{{ proj.name }}</span>
                        <i class="fas fa-times" style="cursor: pointer; color: var(--error);" @click.stop="deleteProject(editingMajorTab, sindex, pindex)"></i>
                      </span>
                      <span v-if="station.projects.length === 0" style="color: var(--text-tertiary);">暂无考核项目</span>
                    </div>
                  </div>
                  <div style="padding-top: 10px; border-top: 1px solid var(--border-light);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 500;">评分表绑定：</span>
                      <button class="btn btn-sm" @click="openScoreTableModal(editingMajorTab, sindex)">+ 添加评分表</button>
                    </div>
                    <div v-if="station.scoreTables.length === 0" style="color: var(--text-tertiary);">暂无评分表</div>
                    <div v-for="(st, stindex) in station.scoreTables" :key="stindex" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #eff6ff; border-radius: 6px; margin-bottom: 4px;">
                      <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                          <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{{ st.name }}</span>
                          <span v-if="st.templateCode" style="font-size:11px;color:var(--text-tertiary);font-family:monospace;">{{ st.templateCode }}</span>
                          <span v-if="st.fileName" style="font-size:11px;color:var(--text-tertiary);">
                            <i class="fas fa-paperclip"></i> {{ st.fileName }}
                          </span>
                        </div>
                        <span style="font-size: 12px; color: var(--text-secondary);">覆盖：{{ st.bindProjects.join(', ') }}</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                        <i v-if="st.fileData" class="fas fa-download" style="cursor:pointer;color:var(--primary);font-size:12px;" title="下载文件" @click="downloadScoreTableFile(st)"></i>
                        <i class="fas fa-times" style="cursor: pointer; color: var(--error);" @click="deleteScoreTable(editingMajorTab, sindex, stindex)"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div style="padding: 16px; border-top: 1px solid var(--border); background: #f9fafb; text-align: right;">
        <button class="btn btn-primary" @click="closeSlidePanel">保存并关闭</button>
      </div>
    </div>
    <div v-if="showSlidePanel" class="panel-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" @click="closeSlidePanel"></div>

    <div v-if="showViewSlidePanel" class="slide-panel open" style="position: fixed; top: 0; right: 0; width: 70%; height: 100%; background: white; box-shadow: -4px 0 20px rgba(0,0,0,0.15); z-index: 1000; display: flex; flex-direction: column;">
      <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f0fdf4;">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">查看：{{ viewingScheme?.name }}</h3>
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
            <span class="badge" :class="{ 'badge-info': viewingScheme?.type === 'platform', 'badge-warning': viewingScheme?.type === 'province', 'badge-error': viewingScheme?.type === 'institution' }" style="font-size: 11px;">{{ viewingScheme?.type === 'platform' ? '平台' : viewingScheme?.type === 'province' ? '省级' : '机构' }}</span>
            <span style="font-size: 13px; color: var(--text-secondary);">来源：{{ viewingScheme?.source }}</span>
          </div>
        </div>
        <button class="btn" @click="closeViewPanel"><i class="fas fa-times"></i> 关闭</button>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 16px;">
        <div v-if="!viewingScheme" style="text-align: center; padding: 20px;">加载中...</div>
        <div v-else-if="viewingScheme.majors.length === 0" style="text-align: center; padding: 20px; color: var(--text-secondary);">该方案暂无专业配置</div>
        <div v-else>
          <div style="display: flex; align-items: center; gap: 4px; border-bottom: 2px solid var(--border); margin-bottom: 16px; padding-bottom: 0; position: sticky; top: 0; background: white; z-index: 10;">
            <div :style="{ flex: '1', minWidth: 0, overflow: viewMajorsExpanded ? 'visible' : 'hidden', display: 'flex', gap: '4px', flexWrap: viewMajorsExpanded ? 'wrap' : 'nowrap' }">
              <div v-for="(major, midx) in viewingScheme.majors" :key="midx"
                   @click="viewingMajorTab = midx"
                   :style="{ padding: '10px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: viewingMajorTab === midx ? 600 : 400, color: viewingMajorTab === midx ? '#059669' : 'var(--text-secondary)', borderBottom: viewingMajorTab === midx ? '2px solid #059669' : '2px solid transparent', marginBottom: '-2px', whiteSpace: 'nowrap', transition: 'all .15s', borderRadius: '6px 6px 0 0' }"
                   @mouseenter="$event.target.style.background = viewingMajorTab !== midx ? '#f0fdf4' : 'transparent'"
                   @mouseleave="$event.target.style.background = 'transparent'">
                {{ major.name }}
              </div>
              <button v-if="viewingScheme.majors.length > 1" class="btn btn-sm" @click="viewMajorsExpanded = !viewMajorsExpanded" style="margin-bottom: 2px; padding: 2px 8px; font-size: 11px; white-space: nowrap; flex-shrink: 0; color: var(--text-secondary);">
                {{ viewMajorsExpanded ? '收起' : '展开(' + viewingScheme.majors.length + ')' }}
              </button>
            </div>
          </div>
          <div v-if="viewingScheme.majors[viewingMajorTab]" style="border: 1px solid var(--border); border-radius: 8px;">
            <div style="padding: 12px 16px; background: #f0fdf4; border-bottom: 1px solid var(--border); display: flex; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span :style="{ width: '4px', height: '16px', borderRadius: '2px', backgroundColor: viewingMajorTab % 2 === 0 ? '#059669' : '#10b981' }"></span>
                <strong>{{ viewingScheme.majors[viewingMajorTab].name }}专业</strong>
              </div>
              <button class="btn btn-sm" @click="toggleAllViewStations" style="padding: 2px 10px; font-size: 12px;">
                {{ allViewStationsCollapsed ? '展开所有考站' : '收起所有考站' }}
              </button>
            </div>
            <div v-if="viewingScheme.majors[viewingMajorTab].stations.length === 0" style="padding: 16px; color: var(--text-secondary); text-align: center;">暂无考站</div>
            <div v-for="(station, vsidx) in viewingScheme.majors[viewingMajorTab].stations" :key="station.name" style="border-bottom: 1px solid var(--border-light); padding: 0;">
              <div @click="toggleViewStation(vsidx)" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer;">
                <i class="fas" :class="viewStationCollapsed[vsidx] ? 'fa-chevron-right' : 'fa-chevron-down'" style="color: var(--text-tertiary);"></i>
                <strong>{{ station.name }}</strong>
                <span style="font-size: 13px; color: var(--text-secondary);">时长：{{ station.duration }} 分钟</span>
              </div>
              <div v-show="!viewStationCollapsed[vsidx]" style="padding: 0 16px 12px 16px;">
                <div style="margin-bottom: 8px;">
                  <div style="font-weight: 500; margin-bottom: 6px;">考核项目：</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <span v-for="proj in station.projects" :key="proj.name" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; font-size: 13px;">{{ proj.name }}</span>
                    <span v-if="station.projects.length === 0" style="color: var(--text-tertiary);">暂无考核项目</span>
                  </div>
                </div>
                <div style="padding-top: 10px; border-top: 1px solid var(--border-light);">
                  <div style="font-weight: 500; margin-bottom: 6px;">评分表绑定：</div>
                  <div v-if="station.scoreTables.length === 0" style="color: var(--text-tertiary);">暂无评分表</div>
                  <div v-for="st in station.scoreTables" :key="st.name" style="display: flex; align-items: center; padding: 6px 10px; background: #f0fdf4; border-radius: 6px; margin-bottom: 4px;">
                    <div>
                      <span style="background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 6px;">{{ st.name }}</span>
                      <span v-if="st.fileName" style="font-size:11px;color:var(--text-tertiary);"><i class="fas fa-paperclip"></i> {{ st.fileName }}</span>
                      <span style="font-size: 12px; color: var(--text-secondary); display:block;margin-top:2px;">覆盖：{{ st.bindProjects.join(', ') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="padding: 16px; border-top: 1px solid var(--border); background: #f9fafb; text-align: right;">
        <button class="btn" @click="closeViewPanel">关闭</button>
      </div>
    </div>
    <div v-if="showViewSlidePanel" class="panel-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" @click="closeViewPanel"></div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background: white; border-radius: 12px; width: 450px; padding: 24px;">
        <h3 style="margin-bottom: 16px;">新增方案</h3>
        <div class="filter-item mb-3">
          <label>方案名称 *</label>
          <input class="input" v-model="newSchemeName" placeholder="请输入方案名称">
        </div>
        <div class="filter-item mb-3">
          <label>类型</label>
          <input class="input" value="机构" disabled style="background: #f3f4f6;">
        </div>
        <div class="filter-item mb-3">
          <label>机构 *</label>
          <input class="input" :value="newSchemeInstitution" disabled style="background: #f3f4f6;">
        </div>
        <div class="filter-item mb-3">
          <label>培训阶段 *</label>
          <input class="input" :value="activePhaseTab" disabled style="background: #f3f4f6;">
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="closeAddModal">取消</button>
          <button class="btn btn-primary" @click="saveNewScheme">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showAddMajorModal" class="modal-overlay" @click.self="showAddMajorModal = false" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background: white; border-radius: 12px; width: 380px; padding: 24px;">
        <h3 style="margin-bottom: 16px;">添加专业</h3>
        <div class="filter-item mb-3">
          <label>选择专业 *</label>
          <select class="select" v-model="newMajorName">
            <option value="">请选择专业</option>
            <option v-for="maj in availableMajors" :key="maj" :value="maj">{{ maj }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="showAddMajorModal = false">取消</button>
          <button class="btn btn-primary" @click="addMajor">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showAddStationModal" class="modal-overlay" @click.self="showAddStationModal = false" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div style="background: white; border-radius: 12px; width: 380px; padding: 24px;">
        <h3 style="margin-bottom: 16px;">添加考站类型</h3>
        <div class="filter-item mb-3">
          <label>考站名称 *</label>
          <input class="input" v-model="newStationName" placeholder="如：接诊病人站">
          <div v-if="availableStationPresets.length" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
            <span style="font-size: 11px; color: var(--text-tertiary); align-self: center;">常用：</span>
            <span v-for="name in availableStationPresets" :key="name"
                  style="padding: 2px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; font-size: 12px; color: #1e40af; cursor: pointer; transition: all .15s;"
                  @click="newStationName = name"
                  @mouseenter="$event.target.style.background='#dbeafe'"
                  @mouseleave="$event.target.style.background='#eff6ff'">
              {{ name }}
            </span>
          </div>
        </div>
        <div class="filter-item mb-3">
          <label>考试时长 *</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" class="input" v-model.number="newStationDuration" style="width: 80px;" min="1"> 分钟
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="showAddStationModal = false">取消</button>
          <button class="btn btn-primary" @click="addStation">确定</button>
        </div>
      </div>
    </div>

    <div v-if="showScoreTableModal && currentStationContext" class="modal-overlay" @click.self="showScoreTableModal = false" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;">
      <div style="background:white;border-radius:12px;width:560px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        <!-- 头部 -->
        <div style="padding:18px 24px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;">
          <span style="width:36px;height:36px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;">📋</span>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:600;">选择评分表</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-tertiary);">从评分表管理中选择，单选绑定考核项目</p>
          </div>
        </div>
        <!-- 主体 -->
        <div style="padding:20px 24px;overflow-y:auto;flex:1;">
          <!-- 搜索 -->
          <div style="position:relative;margin-bottom:16px;">
            <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-tertiary);font-size:13px;"></i>
            <input class="input" v-model="scoreTableSearchKeyword" placeholder="搜索评分表名称、编码或专业..." style="width:100%;padding-left:34px;box-sizing:border-box;height:38px;">
          </div>
          <!-- 评分表列表 -->
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            <div style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:12px;color:var(--text-secondary);font-weight:600;">
              可选评分表 <span style="font-weight:400;color:var(--text-tertiary);">（{{ filteredScoreTableOptions.length }} 个）</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;">
              <div v-if="filteredScoreTableOptions.length === 0" style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:13px;">
                <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;color:#d1d5db;"></i>
                无匹配评分表
              </div>
              <label v-for="(st, idx) in filteredScoreTableOptions" :key="st.template_code || idx"
                     style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;transition:background .12s;border-bottom:1px solid #f3f4f6;"
                     :style="{ background: scoreTableSelectedCode === st.template_code ? '#eff6ff' : '#fff' }"
                     @mouseenter="$event.target.style.background = scoreTableSelectedCode !== st.template_code ? '#fafbfc' : '#eff6ff'"
                     @mouseleave="$event.target.style.background = scoreTableSelectedCode === st.template_code ? '#eff6ff' : '#fff'">
                <input type="radio" :value="st.template_code" v-model="scoreTableSelectedCode" style="flex-shrink:0;accent-color:var(--primary);">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:500;color:#1f2937;line-height:1.4;">{{ st.template_name }}</div>
                  <div style="display:flex;gap:12px;margin-top:3px;">
                    <span style="font-size:11px;color:var(--text-tertiary);font-family:monospace;">{{ st.template_code }}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">{{ st.specialty }}</span>
                    <span style="font-size:11px;color:var(--text-tertiary);">引用 {{ st.usage_count }} 次</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <!-- 绑定项目 -->
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:12px;color:var(--text-secondary);font-weight:600;">
              绑定考核项目 <span style="font-weight:400;color:var(--text-tertiary);">（多选，{{ scoreTableSelectedProject.length }} 个已选）</span>
            </div>
            <div style="padding:6px 0;max-height:150px;overflow-y:auto;">
              <div v-if="freeProjectsForScoreTable.length === 0" style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:13px;">所有考核项目已绑定评分表</div>
              <label v-for="proj in freeProjectsForScoreTable" :key="proj.name"
                     style="display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;transition:background .12s;"
                     :style="{ background: scoreTableSelectedProject.includes(proj.name) ? '#f0fdf4' : '#fff' }"
                     @mouseenter="$event.target.style.background = scoreTableSelectedProject.includes(proj.name) ? '#f0fdf4' : '#fafbfc'"
                     @mouseleave="$event.target.style.background = scoreTableSelectedProject.includes(proj.name) ? '#f0fdf4' : '#fff'">
                <input type="checkbox" :value="proj.name" v-model="scoreTableSelectedProject" style="flex-shrink:0;accent-color:var(--success);width:16px;height:16px;">
                <span style="font-size:13px;color:#1f2937;">{{ proj.name }}</span>
                <span v-if="scoreTableSelectedProject.includes(proj.name)" style="font-size:11px;color:#16a34a;margin-left:auto;">已选</span>
              </label>
            </div>
          </div>
        </div>
        <!-- 底部 -->
        <div style="padding:14px 24px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn" @click="showScoreTableModal = false" style="min-width:80px;">取消</button>
          <button class="btn btn-primary" @click="submitScoreTable" :disabled="!scoreTableSelectedCode || scoreTableSelectedProject.length === 0" style="min-width:80px;">确定绑定</button>
        </div>
      </div>
    </div>

    <div v-if="showProjectModal && currentStationContext" class="modal-overlay" @click.self="showProjectModal = false" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:1000;">
      <div class="modal-content" style="background:white;border-radius:12px;width:400px;padding:20px;">
        <h3 style="margin-bottom:12px;">配置考核项目</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">可多选，添加后可在考站卡片中修改分值</p>
        <div style="border:1px solid var(--border);border-radius:8px;padding:10px;max-height:300px;overflow-y:auto;">
          <div v-for="item in availableForProject" :key="item" style="margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" :value="item" v-model="projectSelected" style="width:16px;height:16px;">
              <span>{{ item }}</span>
            </label>
          </div>
          <div v-if="availableForProject.length === 0" style="color:var(--text-secondary);text-align:center;padding:10px;">所有项目已添加</div>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">* 项目分值根据绑定的评分表确定</p>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn" @click="showProjectModal = false">取消</button>
          <button class="btn btn-primary" @click="submitProject">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { confirm, toast } from '@ai-sp/shared'
import { loadAllSchemes, saveSchemeEdit, removeSchemeEdit } from '@/data/station-schemes/index.js'
import { SCORE_SHEET_TEMPLATES } from '@/data/templates/index.js'
import { useAdminStore } from '@/stores/admin'

const adminStore = useAdminStore()

const schemes = ref([])

const institutionProvinceMap = {
  '仁爱医院 (总部)': '北京',
  '华西医院': '四川',
  '中山医院': '广东',
  '协和医院': '北京',
  '同济医院': '湖北',
  '省立医院': '安徽',
  '瑞金医院': '上海',
  '北大第一医院': '北京',
  '湘雅医院': '湖南',
  '齐鲁医院': '山东',
  '郑大一附院': '河南',
  '南方医院': '广东',
  '西南医院': '重庆',
  '清华长庚医院': '北京',
  '浙江省人民医院': '浙江'
}

const SELECTION_PREFIX = 'ai-sp-station-selection-'

function isSchemeVisible(scheme) {
  if (!scheme) return false
  if (scheme.type === 'institution') return scheme.source === adminStore.currentInstitution
  if (scheme.type === 'platform') return scheme.status
  if (scheme.type === 'province') {
    const province = institutionProvinceMap[adminStore.currentInstitution] || ''
    return scheme.source === province && scheme.status
  }
  return false
}

function loadSelection() {
  // 机构已有启用的自建方案 → 优先使用，不触发平台/省级回退（避免同时启用两个）
  const enabledInst = schemes.value.find(s => s.type === 'institution' && s.source === adminStore.currentInstitution && s.status)
  if (enabledInst) return enabledInst.id

  // 检查 localStorage 保存的选择是否仍然有效
  try {
    const raw = localStorage.getItem(SELECTION_PREFIX + adminStore.currentInstitution)
    if (raw) {
      const schemeId = JSON.parse(raw).schemeId
      const scheme = schemes.value.find(s => s.id === schemeId)
      if (scheme && isSchemeVisible(scheme)) return schemeId
      // 方案已不可用（被运营平台禁用或切换），清除旧选择，级联回退
      clearSelection()
    }
  } catch { /* ignore */ }
  // 级联回退：省级（同省启用） → 平台（启用） → 机构（本机构）
  const province = institutionProvinceMap[adminStore.currentInstitution] || ''
  const fallbackProvince = schemes.value.find(s => s.type === 'province' && s.source === province && s.status)
  if (fallbackProvince) return fallbackProvince.id
  const fallbackPlatform = schemes.value.find(s => s.type === 'platform' && s.status)
  if (fallbackPlatform) return fallbackPlatform.id
  const fallbackInst = schemes.value.find(s => s.type === 'institution' && s.source === adminStore.currentInstitution)
  return fallbackInst ? fallbackInst.id : null
}

function saveSelection(schemeId) {
  localStorage.setItem(SELECTION_PREFIX + adminStore.currentInstitution, JSON.stringify({ schemeId }))
}

function clearSelection() {
  localStorage.removeItem(SELECTION_PREFIX + adminStore.currentInstitution)
}

const institutionSelection = ref(loadSelection())

onMounted(async () => {
  try {
    const data = await loadAllSchemes()
    schemes.value = data
    // 数据加载后重新校验选择（可能因运营端操作导致旧选择失效）
    institutionSelection.value = loadSelection()
  } catch (e) {
    console.error('❌ 考站设置页面初始化失败:', e)
  }
})

watch(() => adminStore.currentInstitution, () => {
  institutionSelection.value = loadSelection()
  resetFilter()
})

const filterName = ref('')
const filterType = ref('')
const filterStatus = ref('')
const activeFilterName = ref('')
const activeFilterType = ref('')
const activeFilterStatus = ref('')
const activePhaseTab = ref('住院医师')
const phaseTabs = [
  { label: '院校教育', value: '院校教育' },
  { label: '住院医师', value: '住院医师' },
  { label: '专科培训', value: '专科培训' }
]
const currentPage = ref(1)
const pageSize = ref(10)

const editingScheme = ref(null)
const showSlidePanel = ref(false)
const showViewSlidePanel = ref(false)
const viewingScheme = ref(null)
const showAddModal = ref(false)
const newSchemeName = ref('')
const newSchemeInstitution = ref('')
const currentStationContext = ref(null)
const showScoreTableModal = ref(false)
const showProjectModal = ref(false)
const showAddStationModal = ref(false)
const newStationName = ref('')
const newStationDuration = ref(15)
const currentMajorIndex = ref(null)
const showAddMajorModal = ref(false)
const newMajorName = ref('')
const allMajors = [
  '内科', '儿科', '急诊科', '精神科', '全科', '皮肤科', '神经内科', '康复医学科', '重症医学科',
  '普通外科', '胸心外科', '泌尿外科', '整形外科', '骨科', '儿外科',
  '妇产科', '麻醉科',
  '眼科', '耳鼻咽喉科',
  '口腔全科', '口腔内科', '口腔颌面外科', '口腔修复科', '口腔正畸科', '口腔病理科', '口腔颌面影像科',
  '放射科', '超声科', '核医学科', '临床病理科', '检验医学科',
  '放射肿瘤科', '医学遗传科', '预防医学科'
]

const availableMajors = computed(() => {
  if (!editingScheme.value) return allMajors
  const usedNames = new Set(editingScheme.value.majors.map(m => m.name))
  return allMajors.filter(n => !usedNames.has(n))
})

const commonStationNames = ['接诊病人站', '病历书写站', '病例分析站', '技能操作站', '体格检查站', '急救技能站', '辅助检查站', '临床思维站', '交流沟通站', '病史采集站', '接诊和沟通站', '精神检查站']

const availableStationPresets = computed(() => {
  if (!editingScheme.value || currentMajorIndex.value === null) return []
  const major = editingScheme.value.majors[currentMajorIndex.value]
  if (!major) return []
  const usedNames = new Set(major.stations.map(s => s.name))
  return commonStationNames.filter(n => !usedNames.has(n))
})

const editingMajorTab = ref(0)
const viewingMajorTab = ref(0)
const majorsExpanded = ref(false)
const viewMajorsExpanded = ref(false)
const viewStationCollapsed = ref({})

const draggedStation = ref(null)
const draggedProject = ref(null)

const scoreTableSearchKeyword = ref('')
const scoreTableSelectedCode = ref('')
const scoreTableSelectedProject = ref([])
// 从评分表模板数据动态生成可用评分表列表
const scoreTableAvailable = computed(() =>
  SCORE_SHEET_TEMPLATES.map(tpl => ({
    template_code: tpl.code,
    template_name: tpl.name,
    specialty: tpl.specialty || '通用',
    usage_count: tpl.usage_count || 0
  }))
)

const filteredScoreTableOptions = computed(() => {
  const kw = scoreTableSearchKeyword.value.trim().toLowerCase()
  if (!kw) return scoreTableAvailable.value
  return scoreTableAvailable.value.filter(st =>
    st.template_name.toLowerCase().includes(kw) ||
    st.template_code.toLowerCase().includes(kw) ||
    st.specialty.toLowerCase().includes(kw)
  )
})

const projectSelected = ref([])
const projectCandidates = [
  '病史采集',
  '体格检查',
  '人文沟通',
  '初步诊断',
  '书写病历',
  '病例分析',
  '精神检查'
]

// 机构模式下：机构方案用自己的status，平台/省级方案用本地选择
function isSchemeEnabled(scheme) {
  if (scheme.type === 'institution') return scheme.status
  return institutionSelection.value === scheme.id
}

function isSchemeSelected(scheme) {
  return isSchemeEnabled(scheme)
}

const filteredSchemes = computed(() => {
  const province = institutionProvinceMap[adminStore.currentInstitution] || ''
  let list = schemes.value.filter(s => s.type === 'institution' && s.source === adminStore.currentInstitution
    || (s.type === 'platform' && s.status)
    || (s.type === 'province' && s.source === province && s.status))
  if (activePhaseTab.value) list = list.filter(s => s.phase === activePhaseTab.value)
  if (activeFilterName.value) list = list.filter(s => s.name.includes(activeFilterName.value))
  if (activeFilterType.value) list = list.filter(s => s.type === activeFilterType.value)
  if (activeFilterStatus.value !== '') {
    const statusVal = activeFilterStatus.value === 'enabled'
    list = list.filter(s => isSchemeEnabled(s) === statusVal)
  }
  return list
})

const pagedSchemes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSchemes.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.ceil(filteredSchemes.value.length / pageSize.value) || 0)

const stationProjectsForScoreTable = computed(() => {
  if (!currentStationContext.value || !editingScheme.value) return []
  const { majorIndex, stationIndex } = currentStationContext.value
  return editingScheme.value.majors[majorIndex].stations[stationIndex].projects
})

const freeProjectsForScoreTable = computed(() => {
  if (!currentStationContext.value || !editingScheme.value) return []
  const { majorIndex, stationIndex } = currentStationContext.value
  const bound = new Set()
  editingScheme.value.majors[majorIndex].stations[stationIndex].scoreTables.forEach(b => b.bindProjects.forEach(p => bound.add(p)))
  return stationProjectsForScoreTable.value.filter(p => !bound.has(p.name))
})

const availableForProject = computed(() => {
  if (!currentStationContext.value || !editingScheme.value) return []
  const { majorIndex, stationIndex } = currentStationContext.value
  const existNames = new Set(editingScheme.value.majors[majorIndex].stations[stationIndex].projects.map(p => p.name))
  return projectCandidates.filter(c => !existNames.has(c))
})

function search() {
  activeFilterName.value = filterName.value
  activeFilterType.value = filterType.value
  activeFilterStatus.value = filterStatus.value
  currentPage.value = 1
}

function resetFilter() {
  filterName.value = ''
  filterType.value = ''
  filterStatus.value = ''
  activeFilterName.value = ''
  activeFilterType.value = ''
  activeFilterStatus.value = ''
  currentPage.value = 1
}

function goPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

function toggleStatus(schemeId) {
  const target = schemes.value.find(s => s.id === schemeId)
  if (!target) return
  const enabled = isSchemeEnabled(target)
  if (enabled) {
    const province = institutionProvinceMap[adminStore.currentInstitution] || ''
    const fallbackProvince = schemes.value.find(s =>
      s.id !== target.id && s.type === 'province' && s.source === province && s.status
    )
    const fallbackPlatform = schemes.value.find(s =>
      s.id !== target.id && s.type === 'platform' && s.status
    )
    const fallbackInst = schemes.value.find(s =>
      s.id !== target.id && s.type === 'institution' && s.source === adminStore.currentInstitution && !s.status
    )
    const fallback = fallbackProvince || fallbackPlatform || fallbackInst
    if (fallback) {
      setSchemeEnabled(target, false)
      setSchemeEnabled(fallback, true)
      toast.show(`已自动切换为"${fallback.name}"`, 'info')
      return
    }
    toast.show('机构必须启用一个方案，无法禁用最后一个启用的方案。', 'warning')
    return
  } else {
    confirm('确定要启用"' + target.name + '"吗？启用后将自动禁用其他方案。').then(ok => {
      if (ok) {
        const province = institutionProvinceMap[adminStore.currentInstitution] || ''
        schemes.value.filter(s =>
          (s.type === 'institution' && s.source === adminStore.currentInstitution)
          || (s.type === 'platform' && s.status)
          || (s.type === 'province' && s.source === province && s.status)
        ).forEach(s => { setSchemeEnabled(s, false) })
        setSchemeEnabled(target, true)
      }
    }).catch(() => {})
    return
  }
}

async function setSchemeEnabled(scheme, enabled) {
  if (scheme.type === 'institution') {
    scheme.status = enabled
    await saveSchemeEdit(scheme)
  } else {
    if (enabled) {
      institutionSelection.value = scheme.id
      saveSelection(scheme.id)
    } else {
      institutionSelection.value = null
      clearSelection()
    }
  }
}

async function copyScheme(schemeId) {
  const original = schemes.value.find(s => s.id === schemeId)
  if (!original) return
  const copy = JSON.parse(JSON.stringify(original))
  copy.id = 'res-inst-' + Date.now()
  copy.name = copy.name + ' (副本)'
  copy.type = 'institution'
  copy.source = adminStore.currentInstitution
  copy.status = false
  schemes.value.push(copy)
  await saveSchemeEdit(copy)
}

function openAddModal() {
  showAddModal.value = true
  newSchemeName.value = ''
  newSchemeInstitution.value = adminStore.currentInstitution
}

function closeAddModal() { showAddModal.value = false }

async function saveNewScheme() {
  if (!newSchemeName.value.trim()) { toast.show('请输入方案名称', 'warning'); return }
  const scheme = { id: 'res-inst-' + Date.now(), name: newSchemeName.value, type: 'institution', source: adminStore.currentInstitution, phase: activePhaseTab.value, status: false, majors: [] }
  schemes.value.push(scheme)
  await saveSchemeEdit(scheme)
  showAddModal.value = false
}

function openEditPanel(schemeId) {
  const scheme = schemes.value.find(s => s.id === schemeId)
  if (!scheme || scheme.type !== 'institution') return
  editingScheme.value = JSON.parse(JSON.stringify(scheme))
  editingScheme.value.majors.forEach(major => { major.stations.forEach(st => { if (st.collapsed === undefined) st.collapsed = false }) })
  editingMajorTab.value = 0
  majorsExpanded.value = false
  showSlidePanel.value = true
}

async function closeSlidePanel() {
  if (editingScheme.value) {
    const idx = schemes.value.findIndex(s => s.id === editingScheme.value.id)
    if (idx !== -1) {
      schemes.value[idx] = JSON.parse(JSON.stringify(editingScheme.value))
      await saveSchemeEdit(schemes.value[idx])
    }
  }
  showSlidePanel.value = false
  editingScheme.value = null
}

function deleteScheme(schemeId) {
  const scheme = schemes.value.find(s => s.id === schemeId)
  if (scheme.type !== 'institution') { toast.show('无权删除平台/省级方案', 'warning'); return }
  confirm(`确定要删除"${scheme.name}"吗？此操作不可恢复。`).then(async ok => {
    if (ok) {
      schemes.value = schemes.value.filter(s => s.id !== schemeId)
      await removeSchemeEdit(schemeId)
    }
  }).catch(() => {})
}

function viewScheme(schemeId) {
  const scheme = schemes.value.find(s => s.id === schemeId)
  if (!scheme) return
  viewingScheme.value = JSON.parse(JSON.stringify(scheme))
  viewingScheme.value.majors.forEach(major => { major.stations.forEach(st => { st.collapsed = false }) })
  viewingMajorTab.value = 0
  viewMajorsExpanded.value = false
  viewStationCollapsed.value = {}
  showViewSlidePanel.value = true
}

function closeViewPanel() { showViewSlidePanel.value = false; viewingScheme.value = null }

function toggleViewStation(idx) {
  viewStationCollapsed.value[idx] = !viewStationCollapsed.value[idx]
}

const allViewStationsCollapsed = computed(() => {
  if (!viewingScheme.value || !viewingScheme.value.majors[viewingMajorTab.value]) return false
  const stations = viewingScheme.value.majors[viewingMajorTab.value].stations
  return stations.length > 0 && stations.every((_, i) => viewStationCollapsed.value[i])
})

function toggleAllViewStations() {
  if (!viewingScheme.value) return
  const stations = viewingScheme.value.majors[viewingMajorTab.value].stations
  const collapse = !allViewStationsCollapsed.value
  stations.forEach((_, i) => { viewStationCollapsed.value[i] = collapse })
}

function openAddMajorModal() { showAddMajorModal.value = true; newMajorName.value = '' }

function addMajor() {
  if (!editingScheme.value) return
  if (!newMajorName.value) { toast.show('请选择专业', 'warning'); return }
  if (editingScheme.value.majors.some(m => m.name === newMajorName.value)) { toast.show('该专业已存在', 'warning'); return }
  editingScheme.value.majors.push({ name: newMajorName.value, stations: [] })
  showAddMajorModal.value = false
}

function deleteMajor(index) {
  if (!editingScheme.value) return
  const major = editingScheme.value.majors[index]
  confirm(`确定删除"${major.name}专业"吗？`).then(ok => {
    if (ok) {
      editingScheme.value.majors.splice(index, 1)
      if (editingMajorTab.value >= editingScheme.value.majors.length) {
        editingMajorTab.value = Math.max(0, editingScheme.value.majors.length - 1)
      }
    }
  }).catch(() => {})
}

function getSharedMajors(currentMajorIdx, stationName) {
  if (!editingScheme.value) return []
  return editingScheme.value.majors
    .filter((m, i) => i !== currentMajorIdx && m.stations.some(s => s.name === stationName))
    .map(m => m.name)
}

function syncStationName(majorIndex, stationIndex) {
  if (!editingScheme.value) return
  const station = editingScheme.value.majors[majorIndex]?.stations[stationIndex]
  if (!station) return
  station._prevName = station.name
}

const allStationsCollapsed = computed(() => {
  if (!editingScheme.value) return false
  return editingScheme.value.majors.every(m => m.stations.every(s => s.collapsed))
})

function toggleAllStations() {
  if (!editingScheme.value) return
  const collapse = !allStationsCollapsed.value
  editingScheme.value.majors.forEach(m => m.stations.forEach(s => s.collapsed = collapse))
}

function toggleStation(majorIndex, stationIndex) {
  const station = editingScheme.value?.majors[majorIndex]?.stations[stationIndex]
  if (!station) return
  station._prevName = station.name
  station.collapsed = !station.collapsed
}

function openAddStationModal(majorIndex) {
  currentMajorIndex.value = majorIndex
  newStationName.value = ''
  newStationDuration.value = 15
  showAddStationModal.value = true
}

function addStation() {
  if (!editingScheme.value) return
  if (!newStationName.value.trim()) { toast.show('请输入考站名称', 'warning'); return }
  const major = editingScheme.value.majors[currentMajorIndex.value]
  if (major.stations.some(s => s.name === newStationName.value)) { toast.show('该考站名称已存在', 'warning'); return }
  major.stations.push({ name: newStationName.value, duration: newStationDuration.value, collapsed: false, projects: [], scoreTables: [] })
  showAddStationModal.value = false
}

function deleteStation(majorIndex, stationIndex) {
  if (!editingScheme.value) return
  confirm('确定删除该考站吗？').then(ok => {
    if (ok) editingScheme.value.majors[majorIndex].stations.splice(stationIndex, 1)
  }).catch(() => {})
}

function stationDragStart(e, majorIndex, stationIndex) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify({ majorIndex, stationIndex }))
  draggedStation.value = { majorIndex, stationIndex }
}

function stationDragOver(e) { e.preventDefault() }

function stationDrop(e, targetMajorIndex, targetStationIndex) {
  e.preventDefault()
  if (!draggedStation.value) return
  const { majorIndex: fromMajor, stationIndex: fromStation } = draggedStation.value
  if (fromMajor !== targetMajorIndex) return
  const stations = editingScheme.value.majors[targetMajorIndex].stations
  const item = stations.splice(fromStation, 1)[0]
  stations.splice(targetStationIndex, 0, item)
  draggedStation.value = null
}

function openProjectModal(majorIndex, stationIndex) {
  currentStationContext.value = { majorIndex, stationIndex }
  projectSelected.value = []
  showProjectModal.value = true
}

function submitProject() {
  if (!editingScheme.value) return
  if (projectSelected.value.length === 0) { toast.show('请至少选择一个项目', 'warning'); return }
  const { majorIndex, stationIndex } = currentStationContext.value
  const station = editingScheme.value.majors[majorIndex].stations[stationIndex]
  const result = projectSelected.value.map(name => ({ name }))
  result.forEach(p => station.projects.push(p))
  showProjectModal.value = false
}

function deleteProject(majorIndex, stationIndex, projectIndex) {
  if (!editingScheme.value) return
  const proj = editingScheme.value.majors[majorIndex].stations[stationIndex].projects[projectIndex]
  confirm(`确定删除考核项目"${proj.name}"吗？`).then(ok => {
    if (ok) editingScheme.value.majors[majorIndex].stations[stationIndex].projects.splice(projectIndex, 1)
  }).catch(() => {})
}

function projectDragStart(e, majorIndex, stationIndex, projectIndex) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', JSON.stringify({ majorIndex, stationIndex, projectIndex }))
  draggedProject.value = { majorIndex, stationIndex, projectIndex }
}

function projectDragOver(e) { e.preventDefault() }

function projectDrop(e, targetMajorIndex, targetStationIndex, targetProjectIndex) {
  e.preventDefault()
  if (!draggedProject.value) return
  const { majorIndex: fromMajor, stationIndex: fromStation, projectIndex: fromProject } = draggedProject.value
  if (fromMajor !== targetMajorIndex || fromStation !== targetStationIndex) return
  const projects = editingScheme.value.majors[targetMajorIndex].stations[targetStationIndex].projects
  const item = projects.splice(fromProject, 1)[0]
  projects.splice(targetProjectIndex, 0, item)
  draggedProject.value = null
}

function openScoreTableModal(majorIndex, stationIndex) {
  currentStationContext.value = { majorIndex, stationIndex }
  scoreTableSearchKeyword.value = ''
  scoreTableSelectedCode.value = ''
  scoreTableSelectedProject.value = []
  showScoreTableModal.value = true
}

function submitScoreTable() {
  if (!scoreTableSelectedCode.value) { toast.show('请选择一个评分表', 'warning'); return }
  if (scoreTableSelectedProject.value.length === 0) { toast.show('请至少选择一个考核项目', 'warning'); return }
  if (!editingScheme.value) return

  const { majorIndex, stationIndex } = currentStationContext.value
  const station = editingScheme.value.majors[majorIndex].stations[stationIndex]
  const boundProjects = new Set()
  station.scoreTables.forEach(b => b.bindProjects.forEach(p => boundProjects.add(p)))
  const conflict = scoreTableSelectedProject.value.find(p => boundProjects.has(p))
  if (conflict) { toast.show(`考核项目"${conflict}"已绑定其他评分表，同一项目只能绑定一张评分表`, 'warning'); return }

  const selected = scoreTableAvailable.value.find(st => st.template_code === scoreTableSelectedCode.value)
  if (!selected) { toast.show('未找到所选评分表', 'error'); return }

  station.scoreTables.push({
    name: selected.template_name,
    templateCode: selected.template_code,
    bindProjects: [...scoreTableSelectedProject.value]
  })
  showScoreTableModal.value = false
}

function downloadScoreTableFile(st) {
  if (!st.fileData) return
  const a = document.createElement('a')
  a.href = st.fileData
  a.download = st.fileName || st.name
  a.click()
}

function deleteScoreTable(majorIndex, stationIndex, stIndex) {
  if (!editingScheme.value) return
  confirm('确定删除该评分表绑定吗？').then(ok => {
    if (ok) editingScheme.value.majors[majorIndex].stations[stationIndex].scoreTables.splice(stIndex, 1)
  }).catch(() => {})
}
</script>
