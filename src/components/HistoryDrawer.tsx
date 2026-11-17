import React from 'react';
import { X, Trash2, Clock, ArrowRight } from 'lucide-react';
import type { AppLanguage, LessonPlan } from '../types/lesson';
import { LANGUAGES, UI_COPY } from '../i18n/translations';

interface HistoryDrawerProps {
  language: AppLanguage;
  history: LessonPlan[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: LessonPlan) => void;
  onDeleteLesson: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  language,
  history,
  isOpen,
  onClose,
  onSelectLesson,
  onDeleteLesson,
}) => {
  if (!isOpen) return null;

  const copy = UI_COPY[language];
  const locale = LANGUAGES.find((l) => l.code === language)?.bcp47 || 'uz-UZ';

  const formatDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/55 backdrop-blur-[2px]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside
        className="relative z-10 w-full max-w-md h-full bg-[#0F1522] border-r border-slate-800 shadow-2xl flex flex-col text-slate-100"
        aria-label={copy.historyTitle}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-50">{copy.historyTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{copy.historySubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-700/90 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                {copy.historyEmptyTitle}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {copy.historyEmptySubtitle}
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-slate-800 bg-[#131B2C] hover:border-sky-500/60 transition-all p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLesson(item);
                      onClose();
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span>{item.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {item.question}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeleteLesson(item.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLesson(item);
                        onClose();
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-sky-400 transition-colors"
                      aria-label="Open"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
