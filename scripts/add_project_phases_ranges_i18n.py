import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

PROJECT_PHASES = {
    "de": {
        "title": "Projektphasen", "description": "Aufgaben lassen sich einer Phase zuordnen. Nicht gestartete Phasen bleiben zunächst ausgegraut und ihre Aufgaben erscheinen nicht in der Aufgabenliste.", "add": "Phase", "newName": "Neue Phase", "empty": "Ohne Phasen bleiben Projektaufgaben wie bisher sofort sichtbar.", "color": "Phasenfarbe", "name": "Phasenname", "taskPhase": "Projektphase", "unphased": "Ohne Phase – sofort sichtbar", "pending": "Noch nicht gestartet", "taskPhaseHint": "Aufgaben einer noch nicht gestarteten Phase werden erst nach deren Start in der Aufgabenansicht angezeigt.", "moveUp": "Nach oben", "moveDown": "Nach unten", "edit": "Phasen bearbeiten",
    },
    "en": {
        "title": "Project phases", "description": "Tasks can be assigned to a phase. Phases that have not started remain dimmed and their tasks do not appear in the task list yet.", "add": "Phase", "newName": "New phase", "empty": "Without phases, project tasks remain visible immediately as before.", "color": "Phase color", "name": "Phase name", "taskPhase": "Project phase", "unphased": "No phase – visible immediately", "pending": "Not started yet", "taskPhaseHint": "Tasks in a phase that has not started appear in the task list only after the phase starts.", "moveUp": "Move up", "moveDown": "Move down", "edit": "Edit phases",
    },
    "es": {
        "title": "Fases del proyecto", "description": "Las tareas pueden asignarse a una fase. Las fases no iniciadas se muestran atenuadas y sus tareas aún no aparecen en la lista.", "add": "Fase", "newName": "Nueva fase", "empty": "Sin fases, las tareas del proyecto siguen visibles de inmediato.", "color": "Color de fase", "name": "Nombre de fase", "taskPhase": "Fase del proyecto", "unphased": "Sin fase – visible de inmediato", "pending": "Aún no iniciada", "taskPhaseHint": "Las tareas de una fase no iniciada solo aparecen después de iniciar la fase.", "moveUp": "Subir", "moveDown": "Bajar", "edit": "Editar fases",
    },
    "fr": {
        "title": "Phases du projet", "description": "Les tâches peuvent être associées à une phase. Les phases non démarrées restent grisées et leurs tâches ne figurent pas encore dans la liste.", "add": "Phase", "newName": "Nouvelle phase", "empty": "Sans phases, les tâches du projet restent immédiatement visibles comme auparavant.", "color": "Couleur de la phase", "name": "Nom de la phase", "taskPhase": "Phase du projet", "unphased": "Sans phase – visible immédiatement", "pending": "Pas encore démarrée", "taskPhaseHint": "Les tâches d'une phase non démarrée n'apparaissent dans la liste qu'après son démarrage.", "moveUp": "Monter", "moveDown": "Descendre", "edit": "Modifier les phases",
    },
    "tr": {
        "title": "Proje aşamaları", "description": "Görevler bir aşamaya atanabilir. Başlatılmamış aşamalar soluk görünür ve görevleri henüz görev listesinde yer almaz.", "add": "Aşama", "newName": "Yeni aşama", "empty": "Aşama olmadan proje görevleri eskisi gibi hemen görünür.", "color": "Aşama rengi", "name": "Aşama adı", "taskPhase": "Proje aşaması", "unphased": "Aşamasız – hemen görünür", "pending": "Henüz başlatılmadı", "taskPhaseHint": "Başlatılmamış bir aşamadaki görevler, aşama başladıktan sonra görev listesinde görünür.", "moveUp": "Yukarı taşı", "moveDown": "Aşağı taşı", "edit": "Aşamaları düzenle",
    },
    "zh": {
        "title": "项目阶段", "description": "任务可以分配给阶段。尚未开始的阶段会淡化显示，其任务暂不会出现在任务列表中。", "add": "阶段", "newName": "新阶段", "empty": "没有阶段时，项目任务会像以前一样立即显示。", "color": "阶段颜色", "name": "阶段名称", "taskPhase": "项目阶段", "unphased": "无阶段——立即显示", "pending": "尚未开始", "taskPhaseHint": "尚未开始的阶段中的任务会在该阶段开始后才出现在任务列表中。", "moveUp": "上移", "moveDown": "下移", "edit": "编辑阶段",
    },
    "ar": {
        "title": "مراحل المشروع", "description": "يمكن إسناد المهام إلى مرحلة. تبقى المراحل التي لم تبدأ باهتة ولا تظهر مهامها في قائمة المهام بعد.", "add": "مرحلة", "newName": "مرحلة جديدة", "empty": "من دون مراحل، تبقى مهام المشروع ظاهرة فوراً كما كانت.", "color": "لون المرحلة", "name": "اسم المرحلة", "taskPhase": "مرحلة المشروع", "unphased": "بلا مرحلة — تظهر فوراً", "pending": "لم تبدأ بعد", "taskPhaseHint": "لا تظهر مهام المرحلة التي لم تبدأ في قائمة المهام إلا بعد بدء المرحلة.", "moveUp": "نقل للأعلى", "moveDown": "نقل للأسفل", "edit": "تعديل المراحل",
    },
}

RANGE_TEXTS = {
    "de": {"range": "Erlaubter Bereich", "rangeSource": "Grenzen", "rangeSlider": "Wert im erlaubten Bereich auswählen", "rangeError": "Der Wert muss innerhalb des erlaubten Bereichs liegen."},
    "en": {"range": "Allowed range", "rangeSource": "Limits", "rangeSlider": "Choose a value within the allowed range", "rangeError": "The value must be within the allowed range."},
    "es": {"range": "Rango permitido", "rangeSource": "Límites", "rangeSlider": "Elegir un valor dentro del rango permitido", "rangeError": "El valor debe estar dentro del rango permitido."},
    "fr": {"range": "Plage autorisée", "rangeSource": "Limites", "rangeSlider": "Choisir une valeur dans la plage autorisée", "rangeError": "La valeur doit se trouver dans la plage autorisée."},
    "tr": {"range": "İzin verilen aralık", "rangeSource": "Sınırlar", "rangeSlider": "İzin verilen aralıktan bir değer seçin", "rangeError": "Değer izin verilen aralıkta olmalıdır."},
    "zh": {"range": "允许范围", "rangeSource": "边界", "rangeSlider": "在允许范围内选择数值", "rangeError": "数值必须在允许范围内。"},
    "ar": {"range": "النطاق المسموح", "rangeSource": "الحدود", "rangeSlider": "اختر قيمة ضمن النطاق المسموح", "rangeError": "يجب أن تكون القيمة ضمن النطاق المسموح."},
}

TASK_PHASE_TEXTS = {
    "de": {"primaryProjectHint": "Die Phase wird für das zuerst ausgewählte Projekt festgelegt.", "noPhases": "Für dieses Projekt wurden noch keine Phasen angelegt."},
    "en": {"primaryProjectHint": "The phase is set for the first selected project.", "noPhases": "No phases have been created for this project yet."},
    "es": {"primaryProjectHint": "La fase se establece para el primer proyecto seleccionado.", "noPhases": "Aún no se han creado fases para este proyecto."},
    "fr": {"primaryProjectHint": "La phase est définie pour le premier projet sélectionné.", "noPhases": "Aucune phase n'a encore été créée pour ce projet."},
    "tr": {"primaryProjectHint": "Aşama, ilk seçilen proje için belirlenir.", "noPhases": "Bu proje için henüz aşama oluşturulmadı."},
    "zh": {"primaryProjectHint": "该阶段将为第一个选定的项目设置。", "noPhases": "此项目尚未创建阶段。"},
    "ar": {"primaryProjectHint": "تُحدَّد المرحلة للمشروع المحدد أولاً.", "noPhases": "لم تُنشأ مراحل لهذا المشروع بعد."},
}

for language in PROJECT_PHASES:
    projects_path = ROOT / language / "projects.json"
    tasks_path = ROOT / language / "tasks.json"
    projects = json.loads(projects_path.read_text(encoding="utf-8"))
    tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    projects["phases"] = {**projects.get("phases", {}), **PROJECT_PHASES[language]}
    tasks.setdefault("variableInput", {}).update(RANGE_TEXTS[language])
    tasks.setdefault("projectPhase", {}).update(TASK_PHASE_TEXTS[language])
    projects_path.write_text(json.dumps(projects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tasks_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
