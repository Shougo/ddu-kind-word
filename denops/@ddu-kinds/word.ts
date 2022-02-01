import {
  ActionFlags,
  BaseKind,
  DduItem,
} from "https://deno.land/x/ddu_vim@v0.1.0/types.ts#^";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v0.1.0/deps.ts";
import { ActionArguments } from "https://deno.land/x/ddu_vim@v0.1.0/base/kind.ts";

export type ActionData = {
  text: string;
  regType?: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  actions: Record<
    string,
    (args: ActionArguments<Params>) => Promise<ActionFlags>
  > = {
    open: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        const action = item?.action as ActionData;

        if (action.text != null) {
          const regType = action.regType ? action.regType : "v";

          const oldValue = fn.getreg(args.denops, '"');
          const oldType = fn.getregtype(args.denops, '"');

          await fn.setreg(args.denops, '"', action.text, regType);
          try {
            await args.denops.cmd('normal! ""' + "p");
          } finally {
            await fn.setreg(args.denops, '"', oldValue, oldType);
          }

          // Open folds
          await args.denops.cmd("normal! zv");
        }
      }

      return Promise.resolve(ActionFlags.None);
    },
  };

  params(): Params {
    return {};
  }
}
