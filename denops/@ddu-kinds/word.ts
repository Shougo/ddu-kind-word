import {
  ActionFlags,
  type Actions,
  type BaseParams,
  type Context,
  type DduItem,
  type PreviewContext,
  type Previewer,
} from "jsr:@shougo/ddu-vim@~10.3.0/types";
import { BaseKind } from "jsr:@shougo/ddu-vim@~10.3.0/kind";
import type { DdcItem } from "jsr:@shougo/ddc-vim@~9.4.0/types";

import type { Denops } from "jsr:@denops/std@~7.5.0";
import * as fn from "jsr:@denops/std@~7.5.0/function";
import * as vars from "jsr:@denops/std@~7.5.0/variable";

export type ActionData = {
  text: string;
  regType?: string;
  item?: DdcItem;
  info?: string;
};

export const WordActions: Actions<Params> = {
  append: {
    description: "Paste the words like |p|.",
    callback: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "p");
      }
      return Promise.resolve(ActionFlags.None);
    },
  },
  complete: {
    description: "It is same with |ddu-kind-word-action-feedkeys| " +
      "but it fires |CompleteDone| autocmd and changes |v:completed_item|.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
        const completedItem = (item?.action as ActionData)?.item;
        if (!completedItem) {
          continue;
        }

        try {
          vars.g.set(args.denops, "completed_item", completedItem);
        } catch (_: unknown) {
          // Ignore
        }

        await args.denops.cmd("silent! doautocmd <nomodeline> CompleteDone");
      }
      return Promise.resolve(ActionFlags.None);
    },
  },
  feedkeys: {
    description: "Use |feedkeys()| to insert the words.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
      }
      return Promise.resolve(ActionFlags.None);
    },
  },
  insert: {
    description: "Paste the words like |P|.",
    callback: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "P");
      }
      return Promise.resolve(ActionFlags.None);
    },
  },
  yank: {
    description: "Yank the words.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        const action = item?.action as ActionData;

        await fn.setreg(args.denops, '"', action.text, "v");
        await fn.setreg(
          args.denops,
          await vars.v.get(args.denops, "register"),
          action.text,
          "v",
        );
      }

      return ActionFlags.Persist;
    },
  },
};

type Params = Record<string, never>;

export class Kind extends BaseKind<Params> {
  override actions = WordActions;

  override getPreviewer(args: {
    denops: Denops;
    item: DduItem;
    actionParams: BaseParams;
    previewContext: PreviewContext;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve({
      kind: "nofile",
      contents: (action.info ?? action.text).split("\n"),
    });
  }

  override params(): Params {
    return {};
  }
}

const paste = async (
  denops: Denops,
  mode: string,
  item: DduItem,
  pasteKey: string,
) => {
  const action = item?.action as ActionData;

  if (action.text === undefined) {
    return;
  }

  const regType = action.regType ?? "v";

  const oldReg = await fn.getreginfo(denops, '"');

  await fn.setreg(denops, '"', action.text, regType);
  try {
    await denops.cmd('normal! ""' + pasteKey);
  } finally {
    await fn.setreg(denops, '"', oldReg);
  }

  if (mode === "i") {
    // Cursor move
    const textLen = await fn.strlen(denops, action.text) as number;
    await fn.cursor(denops, 0, await fn.col(denops, ".") + textLen);
  }

  // Open folds
  await denops.cmd("normal! zv");
};

const feedkeys = async (denops: Denops, item: DduItem) => {
  const action = item?.action as ActionData;

  if (action.text === undefined) {
    return;
  }

  // Use feedkeys() instead
  await fn.feedkeys(denops, action.text, "n");
};
