import { htmlSafe } from "@ember/template";
import { hbs } from "ember-cli-htmlbars";
import { apiInitializer } from "discourse/lib/api";
import { readInputList, traverseNodes } from "../lib/utilities";

export default apiInitializer("0.11.1", (api) => {
  let skipTags = {
    a: true,
    iframe: true,
  };

  settings.excluded_tags.split("|").forEach((tag) => {
    tag = tag.trim().toLowerCase();
    tag && (skipTags[tag] = true);
  });

  let skipClasses = {};

  settings.excluded_classes.split("|").forEach((cls) => {
    cls = cls.trim().toLowerCase();
    cls && (skipClasses[cls] = true);
  });

  const createTooltip = (helper, text, value) => {
    const triggers = helper.widget.site.mobileView
      ? ["hold"]
      : ["hover", "click"];

    return helper.renderGlimmer(
      "span.tooltipfy-word",
      hbs`<DTooltip @interactive={{true}} @inline={{true}} @triggers={{@data.triggers}} @identifier="tooltipfy">
            <:trigger>{{@data.text}}</:trigger>
            <:content>{{@data.value}}</:content>
          </DTooltip>`,
      { text, value: htmlSafe(value), triggers }
    );
  };

  class Action {
    constructor(inputListName, method) {
      this.inputListName = inputListName;
      this.createNode = method;
      this.inputs = {};
    }
  }

  let linkify = new Action("linked_words", createTooltip);
  let actions = [linkify];
  actions.forEach(readInputList);

  api.decorateCookedElement(
    (element, helper) => {
      if (!helper) {
        return;
      }

      actions.forEach((action) => {
        if (Object.keys(action.inputs).length > 0) {
          traverseNodes(helper, element, action, skipTags, skipClasses);
        }
      });
    },
    { id: "tooltipfy-words-theme" }
  );
});
