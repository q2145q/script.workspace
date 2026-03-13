"use client";

import type { TooltipRenderProps } from "react-joyride";
import { X, ChevronRight, SkipForward } from "lucide-react";

export function TutorialTooltip({
  continuous,
  index,
  size,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const progress = size > 0 ? ((index + 1) / size) * 100 : 0;

  return (
    <div
      {...tooltipProps}
      className="max-w-sm rounded-xl bg-zinc-900 text-white shadow-2xl border border-zinc-700/50"
    >
      {/* Progress bar */}
      <div className="h-1 w-full rounded-t-xl bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        {step.title && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-orange-400">
              {step.title as string}
            </h3>
            <span className="text-xs text-zinc-500">
              {index + 1}/{size}
            </span>
          </div>
        )}

        {/* Content */}
        {step.content && (
          <div className="text-sm text-zinc-300 leading-relaxed">
            {step.content}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
          <button
            {...skipProps}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <SkipForward className="w-3 h-3" />
            Пропустить
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Назад
              </button>
            )}
            {continuous && (
              <button
                {...primaryProps}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Далее
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {!continuous && (
              <button
                {...closeProps}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
                Закрыть
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
