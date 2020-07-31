let rows = 1;
let selectedSlots = [];
let colorItems = [];
let items = new Map();        //slot, item
let functionSlots = new Map();//slot, function
let namedSlots = new Map();   //slot, name
let colorIDs = new Map();     //color, id
let colors = [];

$(document).ready(function() {
  updateRowsDisplay();
  updateInventorySlotAmount();
  updateSelectedslots();
  loadJsonData();
  updateOutput();
  checkIfColorItem();
  checkDisplayNameState();

  function loadJsonData() {
    $.getJSON("/cheques/inventorycreator/js/presets.json", function(data) {
      $.each(data.inventoryTypes, function(key, val) {
          $("#inventoryTypeDropdown").append(`<option value="${val}">${key}</option>`)
      });

      $.each(data.items, function(key, val) {
          $("#itemDropdown").append(`<option value="${val}">${key}</option>`)
      });

      $.each(data.colors, function(key, val) {
          $("#colorDropdown").append(`<option value="${val}">${key}</option>`)
          colors.push(val);
      });

      $.each(data.colorItems, function(key, val) {
        colorItems.push(val);
      });

      $.each(data.colorIDs, function(key, val) {
        colorIDs.set(key, val);
      });
    });
  }

  function addRow() {
    rows++;

    selectedSlots = [];
    items = new Map();
    updateRowsDisplay();
    updateSelectedslots();
    updateOutput();
  }
  function removeRow() {
    rows--;

    selectedSlots = [];
    items = new Map();
    updateRowsDisplay();
    updateSelectedslots();
    updateOutput();
  }

  function updateRowsDisplay() {
    if(rows <= 1) {
      rows = 1;
      if(!$("#removeRow").hasClass("disabled"))
        $("#removeRow").removeClass("btn-danger").addClass("disabled btn-secondary");
    } else if(rows >= 6) {
      rows = 6;
      if(!$("#addRow").hasClass("disabled"))
        $("#addRow").removeClass("btn-success").addClass("disabled btn-secondary");
    } else {
      if($("#addRow").hasClass("disabled"))
        $("#addRow").removeClass("disabled btn-secondary").addClass("btn-success");

      if($("#removeRow").hasClass("disabled"))
        $("#removeRow").removeClass("disabled btn-secondary").addClass("btn-danger");
    }

    $("#rowsNum").html(`Rows: ${rows}`)
    updateInventorySlotAmount();
  }

  function updateInventorySlotAmount() {
    let inventoryContent = "";

    inventoryContent += `<div class="row justify-content-center">`;

    for(let j = 0; j < rows * 9; j++) {
      if(j != 0 && j % 9 == 0) {
        inventoryContent +=
        `</div>
         <div class="row justify-content-center">`;
      }
      inventoryContent +=
      `<div class="slot" id="slot-${j}" title='Name: ""'>
          <img class="slot-background" src="images/slot.png">
          <img class="slot-item" src="" style="display:none">
       </div>`;
    }

    inventoryContent += `</div>`;

    $("#inventory").html(inventoryContent);
    $('.slot').tooltip();
  }

  function updateSelectedslots() {
    let sortedSelectedSlots = selectedSlots;
    sortedSelectedSlots.sort((a, b) => a - b);
    if(sortedSelectedSlots.length == 0) {
      $("#selectedSlots").html("-");

      $("#clear").attr("disabled", true);
      $("#clear").removeClass("btn-danger");
      $("#clear").addClass("btn-secondary");

      $("#apply").attr("disabled", true);
      $("#apply").removeClass("btn-primary");
      $("#apply").addClass("btn-secondary");
    } else {
      let selectedSlotsString = sortedSelectedSlots[0];

      for(let i = 1; i < sortedSelectedSlots.length; i++)
        selectedSlotsString += ", " + sortedSelectedSlots[i];

      $("#selectedSlots").html(selectedSlotsString);

      $("#clear").attr("disabled", false);
      $("#clear").removeClass("btn-secondary");
      $("#clear").addClass("btn-danger");

      $("#apply").attr("disabled", false);
      $("#apply").removeClass("btn-secondary");
      $("#apply").addClass("btn-primary");
    }
  }

  function copyToClipboard(element) {
    if(output == "")
      return;

    const $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).text()).select();
    document.execCommand("copy");
    $temp.remove();
    $(".toast").toast("show");
  }

  function onSlotClick(slot, element) {
    if(selectedSlots.includes(slot)) {
      element.find(".slot-background").attr("src", "images/slot.png");
      selectedSlots.splice(selectedSlots.indexOf(slot), 1);
    } else {
      element.find(".slot-background").attr("src", "images/slot_selected.png");
      selectedSlots.push(slot);
    }
    updateSelectedslots();
    checkDisplayNameState();
  }

  function updateFunctionDropdown() {
    $("#functionDropdown").html("");
    $("#functionDropdown").append(`<option value="none">None</option>`);
    $.getJSON("/cheques/inventorycreator/js/presets.json", function(data) {
      switch ($("#inventoryTypeDropdown").val()) {
        case "transfer_inventory":
          $.each(data.functions.transfer_inventory, function(key, val) {
              $("#functionDropdown").append(`<option value="${val}">${key}</option>`)
          });
          break;
        case "banker_edit_gui_main":
          $.each(data.functions.banker_edit_gui_main, function(key, val) {
              $("#functionDropdown").append(`<option value="${val}">${key}</option>`)
          });
          break;
        case "banker_edit_gui_position":
          $.each(data.functions.banker_edit_gui_position, function(key, val) {
              $("#functionDropdown").append(`<option value="${val}">${key}</option>`)
          });
          break;
      }
    });

    functionSlots = new Map();
    updateOutput();
  }

  function updateOutput() {
    if(items.size == 0) {
      $("#output").html(null);
    } else {
      let text = "{i:" + (rows * 9) + ",[";

      let groups = new Map();
      for (const [slot, material] of items.entries()) {
        let foundMatch = false;
        for (const [id, group] of groups.entries()) {
          if(group.compare(material, slot)) {
            group.addSlot(slot);
            foundMatch = true;
          }
        }

        if(!foundMatch) {
          let group = new SlotGroup(material);
          group.addSlot(slot);

          if(functionSlots.has(slot))
            group.setFunction(functionSlots.get(slot));

          if(namedSlots.has(slot))
            group.setName(namedSlots.get(slot));

          groups.set(groups.size, group);
        }
      }

      let containsGroup = false;
      for (const [id, group] of groups.entries()) {
        const byte = group.getByte();
        let byteText = "";
        if(byte != -1)
          byteText = "|b:" + byte;

        const func = group.getFunction();
        let functionText = "";
        if(func != null)
          functionText = "|f:" + func;

        const name = group.getName();
        let nameText = "";
        if(name != null)
          nameText = "|n:" + name;

        if(containsGroup)
          text += ",";

        text += "(m:" + group.getMaterialFormatted() + byteText + "|s:" + group.getFormattedSlots() + functionText + nameText + ")";
        containsGroup = true;
      };

      text += "]}";
      $("#output").html(text);
    }
  }

  function checkIfColorItem() {
    if(colorItems.includes($('#itemDropdown').val())) {
      $("#colorDropdown").attr("disabled", false);
      $("#colorDropdown").find(".null").remove();
    } else {
      $("#colorDropdown").attr("disabled", true);
      $("#colorDropdown").prepend(`<option class="null" value="null">-</option>`);
      $('#colorDropdown').val("null").trigger('change');
    }
  }

  function checkDisplayNameState() {
    if(selectedSlots.length > 0) {
      $("#displayName").prop("disabled", false);
      $("#displayName").removeClass("disabledInput");
    } else {
      $("#displayName").prop("disabled", true);
      $("#displayName").addClass("disabledInput");
    }
  }

  $("#addRow").click(() => {
    addRow();
  });
  $("#removeRow").click(() => {
    removeRow();
  });

  $("#copyOutput").click(() => {
    copyToClipboard("#output");
  });

  $("#inventory").on("click", "div", function() {
    if($(this).hasClass("slot"))
      onSlotClick($(this).attr("id").split("-")[1], $(this));
  });

  $("#inventoryTypeDropdown").on('select2:select', function (e) {
    updateFunctionDropdown();
  });

  $("#itemDropdown").on('select2:select', function (e) {
    checkIfColorItem();
  });

  $("#inventoryTypeDropdown").select2({
    width: '100%'
  });
  $("#itemDropdown").select2({
    width: '100%'
  });
  $("#colorDropdown").select2({
    width: '100%'
  });
  $("#functionDropdown").select2({
    width: '100%'
  });

  $("#apply").click(() => {
    const item = $("#itemDropdown").val();
    let color = null;
    if(colorItems.includes(item))
      color = $("#colorDropdown").val();

    const func = $("#functionDropdown").val();

    selectedSlots.forEach(slot => {
      $("#slot-" + slot).find(".slot-item").show();
      if(func == "cheque") {
        $("#slot-" + slot).find(".slot-item").attr("src", "images/items/paper.png");

        items.set(slot, "paper");
      } else {
        if(color == null) {
          $("#slot-" + slot).find(".slot-item").attr("src", "images/items/" + item + ".png");

          items.set(slot, item);
        } else {
          $("#slot-" + slot).find(".slot-item").attr("src", "images/items/" + color + "_" + item + ".png");

          items.set(slot, color + "_" + item);
        }
      }

      if(func != "none")
        functionSlots.set(slot, func);

      $("#slot-" + slot).find(".slot-background").attr("src", "images/slot.png");
    });

    selectedSlots = [];
    updateSelectedslots();

    updateOutput();
  });
  $("#clear").click(() => {
    selectedSlots.forEach(slot => {
        $("#slot-" + slot).find(".slot-item").hide();
        $("#slot-" + slot).find(".slot-background").attr("src", "images/slot.png");

        if(items.has(slot))
          items.delete(slot);

        if(functionSlots.has(slot))
          functionSlots.delete(slot);

        if(namedSlots.has(slot))
          namedSlots.delete(slot);
    });

    selectedSlots = [];
    updateSelectedslots();

    updateOutput();
  });

  $("#setDisplayName").click(() => {
    const name = $("#displayName").val();
    selectedSlots.forEach(slot => {
      if(name == "") {
        if(namedSlots.has(slot))
          namedSlots.delete(slot);

        $("#slot-" + slot).prop("title", `Name: ""`).tooltip('dispose').tooltip();
      } else {
        namedSlots.set(slot, name);
      }

      $("#slot-" + slot).find(".slot-background").attr("src", "images/slot.png");
      $("#slot-" + slot).prop("title", `Name: "${name}"`).tooltip('dispose').tooltip();
    });

    $("#displayName").val("");
    selectedSlots = [];
    updateSelectedslots();

    updateOutput();
  });

  updateFunctionDropdown();
});

class SlotGroup {
  constructor(material) {
    this.material = material;
  }

  setFunction(func) {
    this.func = func;
  }

  getFunction() {
    return this.func;
  }

  getMaterial() {
    return this.material;
  }

  getMaterialFormatted() {
    let materialFormatted = this.material;
    if(materialFormatted.split("_").length > 0) {
      let color = materialFormatted.split("_")[0];
      if(materialFormatted.split("_").length > 1 && color == "light")
        color += "_" + materialFormatted.split("_")[1];

      if(colors.includes(color))
        materialFormatted = materialFormatted.substring(color.length + 1);
    }

    if(materialFormatted.includes("~"))
      materialFormatted = materialFormatted.split("~")[0];

    return materialFormatted;
  }

  getExtraMaterialData() {
    let materialFormatted = null;

    if(this.material.includes("~"))
      materialFormatted = this.material.split("~")[1];

    return materialFormatted;
  }

  addSlot(slot) {
    let slots = [];

    if(this.slots != null)
      slots = this.slots;

    slots.push(slot);

    this.slots = slots;
  }

  removeSlot(slot) {
    let slots = [];

    if(this.slots != null)
      slots = this.slots;

    if(slots.includes(slot))
      slots.remove(slot);

    this.slots = slots;
  }

  getFormattedSlots() {
    const slots = this.slots.sort((a, b) => a - b);

    let streak = 0;
    let formattedSlots = "";
    for(let i = 0; i < slots.length; i++) {
      if(i == 0) {
        formattedSlots = slots[0];
      } else {
        if(parseInt(slots[i]) != parseInt(slots[i + 1]) - 1) {
          if(streak > 0)
            formattedSlots += "-" + slots[i];
          else
            formattedSlots += "," + slots[i];

          streak = 0;
        } else if(parseInt(slots[i]) != parseInt(slots[i - 1]) + 1) {
          formattedSlots += "," + slots[i];

          streak = 0;
        } else {
          streak++;
        }
      }
    }

    return formattedSlots;
  }

  getByte() {
    let color = null;
    const material = this.material;
    if(material.split("_").length > 0) {
      color = material.split("_")[0];
      if(material.split("_").length > 1 && color == "light")
        color += "_" + material.split("_")[1];
    }

    if(color != null && colors.includes(color)) {
      return colorIDs.get(color);
    } else if(this.getExtraMaterialData() != null) {
      return this.getExtraMaterialData();
    } else {
      return -1;
    }
  }

  setName(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  compare(material, slot) {
    return (
      this.material == material &&
      ((this.func == null && !functionSlots.has(slot)) || this.func == functionSlots.get(slot)) &&
      ((this.name == null && !namedSlots.has(slot)) || this.name == namedSlots.get(slot)));
  }
}
