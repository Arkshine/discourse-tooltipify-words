import Component from "@ember/component";
import { service } from "@ember/service";
import DTooltip from "float-kit/components/d-tooltip";

export default class TooltipWrapper extends Component {
  @service site;

  onRegisterApi(instance) {
    if (!instance.site.mobileView) {
      return;
    }

    let touchStartX, touchStartY, touchEndX, touchEndY;

    instance.trigger.addEventListener("touchstart", function (event) {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    });

    instance.trigger.addEventListener("touchend", function (event) {
      touchEndX = event.changedTouches[0].clientX;
      touchEndY = event.changedTouches[0].clientY;

      if (
        Math.abs(touchStartX - touchEndX) < 10 &&
        Math.abs(touchStartY - touchEndY) < 10
      ) {
        instance.onTrigger();
      }
    });
  }

  get triggers() {
    return this.site.mobileView ? [] : ["hover", "click"];
  }

  <template>
    <DTooltip
      @interactive={{true}}
      @inline={{true}}
      @onRegisterApi={{this.onRegisterApi}}
      @triggers={{this.triggers}}
      @identifier="tooltipfy"
    >
      <:trigger>{{this.data}}</:trigger>
      <:content>{{this.value}}</:content>
    </DTooltip>
  </template>
}
