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

  function loadJsonData() {
    $.getJSON("presets.json", function(data) {
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
  }
  function removeRow() {
    rows--;

    selectedSlots = [];
    items = new Map();
    updateRowsDisplay();
    updateSelectedslots();
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
      `<div class="slot" id="slot-${j}">
          <img class="slot-background" src="images/slot.png">
          <img class="slot-item" src="">
       </div>`;
    }

    inventoryContent += `</div>`;

    $("#inventory").html(inventoryContent);
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
  }

  function updateFunctionDropdown() {
    $("#functionDropdown").html("");
    $("#functionDropdown").append(`<option value="none">None</option>`)
    $.getJSON("presets.json", function(data) {
      if($("#inventoryTypeDropdown").val() == "transfer_inventory") {
        $.each(data.functions.transfer_inventory, function(key, val) {
            $("#functionDropdown").append(`<option value="${val}">${key}</option>`)
        });
      }
    });
  }

  function updateOutput() {
    if(items.size == 0) {
      $("#output").html(null);
    } else {
      let text = "{i:" + (rows * 9) + ",[";

      let groups = [];
      for (const [slot, material] of items.entries()) {
        let foundMatch = false;
        groups.forEach(group => {
          if(group.compare(material, functionSlots.get(slot), name)) {
            let newGroup = group;
            newGroup.addSlot(slot);
            groups.pop(group);
            groups.push(newGroup);
            foundMatch = true;
          }
        });

        if(!foundMatch) {
          let group = new SlotGroup(material);
          group.addSlot(slot);

          if(functionSlots.has(slot))
            group.setFunction(functionSlots.get(slot));

          groups.push(group);
        }
      }

      let containsGroup = false;
      groups.forEach(group => {
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
      });

      text += "]}";
      $("#output").html(text);
    }
  }

  function checkIfColorItem() {
    if(colorItems.includes($('#itemDropdown').val())) {
      $('#colorDropdown').attr("disabled", false);
    } else {
      $('#colorDropdown').attr("disabled", true);
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

  $('#itemDropdown').on('select2:select', function (e) {
    checkIfColorItem();
  });;

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
    let item = $("#itemDropdown").val();
    let color = null;
    if(colorItems.includes(item))
      color = $("#colorDropdown").val();

    let func = $("#functionDropdown").val();

    selectedSlots.forEach(slot => {
      if(color == null) {
        $("#slot-" + slot).find(".slot-item").attr("src", "images/items/" + item + ".png");

        items.set(slot, item);
      } else {
        $("#slot-" + slot).find(".slot-item").attr("src", "images/items/" + color + "_" + item + ".png");

        items.set(slot, color + "_" + item);
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
        $("#slot-" + slot).find(".slot-item").attr("src", "");
        $("#slot-" + slot).find(".slot-background").attr("src", "images/slot.png");

        if(items.has(slot))
          items.delete(slot);
    });

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
    const slots = this.slots;

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

    if(color != null) {
      return colorIDs.get(color);
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
      ((this.func == null && functionSlots.has(slot)) || this.func == functionSlots.get(slot)) &&
      ((this.name == null && namedSlots.has(slot)) || this.name == namedSlots.get(slot)));
  }
}
