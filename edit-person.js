
$(function () {

    var appointments = [];

    //if there are appointments in mode edition
    var allAppointments =  $('.allTitles')
    var appointmentsTable = $( "#appointments-list").find('tbody');

    if (allAppointments.length){
        allAppointments.each(function(){
            var item = $(this);

            appointments.push({id: item.data("id"), title: item.data("title"), row: item.data("row"),
                school: item.data("school"), department: item.data("department"),  program: item.data("program"),
                order: item.data("listing-order"),
                isRemoved: false, role: item.data("role")
            });
        });
    }

    appointmentsTable.sortable({
        stop: () => {
            setRankValue();
        }
    }).disableSelection();

    // init the form wizard, to divide the form into screen steps
    var editPersonForm = $("#edit_person_form");
    editPersonForm.formwizard({
        focusFirstInput: true,formPluginEnabled: true
    }).bind("step_shown", function (event, data) {
        confBackButton();
    });

    editPersonForm.submit(sendSubmit);

    $('.load-catalogs').on('change', loadCombos);

    var phoneNumber = $('#phoneNumber');
    formatPhone(phoneNumber);

    confBackButton();

    phoneNumber.on('blur', function(e){
        e.stopPropagation();
        e.preventDefault();

        formatPhone(this);
    });

    $('#thumbnailURL').on('blur', updateMugShot);

    $('#add-new-title').on('click', setEditedTitle);

    $('#cancel-new-title').on('click', function(e){
        e.preventDefault();

        cancelForm();
    });

    $(".addButton").click(function(e){
        e.preventDefault();

        $(this).hide();
        $('#edition-form').show();
    });

    $(".editButton").click(editRow);

    $(".removeButton").click(removeRow);

    function loadCombos(e) {

        e.preventDefault();
        e.stopPropagation();

        var fromThisType = $(e.currentTarget);
        var level = $(fromThisType).prop("id");

        updateCombos(level, fromThisType.val(), 0);
    }

    function updateCombos(level, id, selectedValue){
        var query = "";
        var elementToUpdate = "";
        id = parseInt(id);

        switch (level){
            case "school":
                query = !!id ? getDepartmentsBySchool(id) : "";
                elementToUpdate = $("#department");
                $("#program").empty().append('<option value="0">choose one</option>');
              break;
            case "department":
                query = !!id ? getProgramsByDepartment(id) : "";
                elementToUpdate = $("#program");
              break;
        }

        var addFormElements = (element, result, selectedValue) => {
            var rows = JSON.parse(result);
            rows.forEach((x) => {
                element.append('<option value="' + x.id +  '">' + $.trim(x.name).substring(0, 50) + '</option>');
            });

            element.val(selectedValue);
        };

        elementToUpdate.empty();
        elementToUpdate.append('<option value="0">choose one</option>');

        if (!query) return;

        query.done(function(result){
            addFormElements(elementToUpdate, result.propMap.data, selectedValue);
        }).always(function(result){
             console.log(result);
        });
    }

    function confBackButton() {
        var step = $('#edit_person_form').formwizard('state');
        var width = 900, height = 700;
        if (step.isFirstStep){  // parent page list
            $('input[type=reset]').hide();
        }
        else if (step.isLastStep){  // page template chooser

            $('input[type=reset]').show();
        }
        else{ // page title, type selector, and alias screen (2nd step)

            $('input[type=reset]').show();
        }

        window.parent.Shadowbox.skin.dynamicResize(width, height);

        setTimeout(addInfoTooltips, 300);
    }

    function setEditedTitle(e){
        e.stopPropagation();
        e.preventDefault();

        var target = $(e.currentTarget);
        var editionType = target.val();
        var row = target.data('row');

        if (editionType == "Add"){
            addTitle();
        }//Apply
        else{
            applyTitle();
        }
    }

    function addTitle(){

        var newTitle = $('#new-title');

        if (!$.trim(newTitle.val())) {
            alert("Enter a new title!");
            return false;
        }

        var school = $('#school');
        var department = $('#department');
        var program = $('#program');
        var role = $('#role');

        var nextRow = appointments.length + 1;
        var cell2HTML = newTitle.find(":selected").text() + paintAppointment(program, department, school);
        var cell3HTML = role.find(":selected").text();
        var cell4HTML = '<a href="#" class="removeButton row-' + nextRow + '" data-row="' + nextRow + '">' +
            '  <img src="' + getContextPath() + '/style/images/delete.png">' +
            '</a>';

        var cell5HTML = '<a href="#" class="editButton row-' + nextRow + '" data-row="' + nextRow + '">' +
            '<img src="' + getContextPath() + '/style/images/edit.png">' +
            '</a>';

        var newRow = `<tr class="row-${nextRow}" data-row="${nextRow}"><td>${nextRow}</td><td class="show-appointment-${nextRow}">${cell2HTML}</td><td class="show-role-${nextRow}">${cell3HTML}</td><td>${cell4HTML}</td><td>${cell5HTML}</td>`;

        var lastRow = appointmentsTable.find('tr:last');

        if (!lastRow.length){
           appointmentsTable.append(newRow);
        }
        else{
           lastRow.after(newRow);
        }

        appointments.push({id: 0,
            title: newTitle.val(),
            row: nextRow,
            school: school.val() || 0 ,
            department: department.val() || 0,
            program: program.val() || 0,
            role: role.val() || 0,
            order: nextRow, isRemoved: false
        });

        newTitle.val(0);

        lastRow = appointmentsTable.find('tr:last');

        lastRow.find(".removeButton").bind('click', removeRow);
        lastRow.find(".editButton").bind('click', editRow);


        $(".addButton").show();
        $('#edition-form').hide();
        paintRow(nextRow, '#D0F5A9');

        cancelForm();
    }

    function applyTitle(){
        var editedTitle = appointments.filter((x) => { return x.inEdition; });
        var title = $('#new-title');
        var school = $('#school');
        var department = $('#department');
        var program = $('#program');
        var role = $('#role');

        if (editedTitle.length){
            editedTitle[0].title = title.val();
            editedTitle[0].school = school.val() || 0;
            editedTitle[0].department = department.val() || 0;
            editedTitle[0].program = program.val() ||  0;
            editedTitle[0].role = role.val() || 0;
            editedTitle[0].inEdition = false;

            $(".show-appointment-" +  editedTitle[0].row).html(title.find(":selected").text() + ' ' + paintAppointment(program, department, school));
            $(".show-role-" +  editedTitle[0].row).html(role.find(":selected").text());

            paintRow(editedTitle[0].row, '#CEF6F5');
        }

        cancelForm();
    }

    function sendSubmit(e){

        e.preventDefault();

        if (!appointments.length){
            alert("Enter at list one new title!");
            return false;
        }

        var params = convertFormToObject($('#edit_person_form'));
        if (!params){
            alert("form with errors....");
            return false;
        }

        params.appointments = appointments;

        console.log(params);

        var query = saveIPerson(params.id, params);

        $('body').mask("saving person data", 0);
        query.done(function(){
            setTimeout(function() {
                $('body').unmask();
                window.parent.location.reload();
            }, 3500);
        })/*.always(function(response){
         console.log(response);
         })*/;
    }

    function convertFormToObject(_form){
        if (!_form) return false;

        return _form.serializeArray().reduce(function(obj, val) {
            obj[val.name] = val.value;
            return obj;
        }, {});
    }

    function formatPhone(obj) {
        var numbers = $(obj).val().replace(/-/g, '').replace(/\D/g, ''),
            char = {0:'(',3:') ',6:' - '};
        var value = '';
        $(obj).val('');

        for (var i = 0; i < numbers.length; i++) {
            value += (char[i]||'') + numbers[i];
        }

        $(obj).val(value);
    }

    function updateMugShot(e){
        e.preventDefault();
        e.stopPropagation();

        var target = $(e.currentTarget);
        var imageUrl = target.val();
        var imageElement = $('#mugShotImage');
        var imageError = $('#mugShotImageError');

        imageElement.attr("src", imageUrl).load(() => {
            imageElement.css('display', 'block');
            imageError .css('display', 'none');
        }).error(() => {
            imageElement.css('display', 'none');
            imageError .css('display', 'block');
        });
    }

    function editRow(e){

        e.preventDefault();
        e.stopPropagation();

        var row = $(this).data('row');

        appointments.forEach((x) => { x.inEdition = false; });

        var editedRow =  appointments.filter((x) => { return x.row === row; });

        if (editedRow[0].isRemoved){
            alert("This element cannot be edited. It is to be removed.");
            return false;
        }

        editedRow[0].inEdition = true;

        $('#new-title').val(editedRow[0].title);
        $('#role').val(editedRow[0].role);
        $('#school').val(editedRow[0].school);
        updateCombos("school", editedRow[0].school, editedRow[0].department);
        updateCombos("department", editedRow[0].department, editedRow[0].program);

        $('.addButton').hide();
        $('#add-new-title').val("Apply");
        $('#edition-form').show();
    }

    function removeRow(e){

        e.preventDefault();
        e.stopPropagation();

        var row = $(this).data('row');
        var color = "#F5A9A9;";
        var removed = true;
        var deletedRow = appointments.filter((x) => { return x.row === row; });

        if (deletedRow[0].inEdition){
            alert("This element cannot be removed. Cancel edition mode.");
            return false;
        }

        if (deletedRow[0].isRemoved){
            removed = false;
            color = "" ;
        }

        deletedRow[0].isRemoved = removed;

        paintRow(row, color);
    }

    function cancelForm ( ){

        //Clean edition/addition form
        appointments.forEach((x) => { x.inEdition = false; });

        $('#new-title').val("");
        $('#school').val(0);
        $('#department').empty();
        $('#program').empty();

        $('#add-new-title').val("Add");
        $(".addButton").show();
        $('#edition-form').hide();
    }

    function paintRow(row, color) {
        $('.row-' + row).css('background-color', color);
    }

    function paintAppointment(program, department, school){

        var textToShow = "";

        textToShow += parseInt(program.val()) ? program.find(":selected").text() + ", " : "";

        textToShow += parseInt(department.val()) ? department.find(":selected").text() + ", " : "";

        textToShow += parseInt(school.val()) ? school.find(":selected").text() : "";

        textToShow = (textToShow.trim()) ? " of " + textToShow : "" ;

        return textToShow;
    }

    function setRankValue(){
        var orderList = $('#appointments-list').find('tbody').find('tr');

        $.each(orderList, function (index, item) {

            var row = $(item).data('row');
            var line = index + 1;
            var appointment = appointments.find((a) => {
                return a.row === row;
            });

            $(item).children().first().html(line);

            appointment.order = line;
        });
    }
});