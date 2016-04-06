   $(document).ready(function () {
        "use strict";

        var sortingTypes = {alphabetical: "1", custom: "3"};
        var groupData = { id: $('#group-id').val(), isNewGroup: !$('#group-id').val(), orderingType: $('#ordering-id').val() || sortingTypes.alphabetical, members: []};  //if GroupId exists is not a new group
        var secondStep = $('#tpl-step-2').html();
        var paintLabels = () => {
            $('#available-members').html($('#search')[0].length + " available(s)");
            $('#selected-members').html($('#search_to')[0].length + " member(s) selected");
        };


        //Initial members on list if is not a new group
        if (!groupData.isNewGroup){
            var selectedGroup = $('#group-list').find('option:selected');

            groupData.name = selectedGroup.text();
            groupData.description = $.trim(selectedGroup.data('description'));

            populateMembers();
        }

        $('#filter_box').keyup(function () {
            var filterValue = $(this).val().toLowerCase();

            $('.ipage-item').each(function () {
                var thisText = $(this).text().toLowerCase();
                if (thisText.indexOf(filterValue) >= 0) {
                    $(this).show();
                }
                else {
                    $(this).hide();
                    $(this).removeClass('selected');
                }
            });
        });

        // init the form wizard, to divide the form into screen steps
        var newPage = $("#new_ipage_form");
        newPage.formwizard({
            focusFirstInput: true,formPluginEnabled: true
        });

        // configure the display of the 'Back' button for each step
        newPage.bind("step_shown", function () {
            confBackButton();
        }).bind("before_step_shown", doBeforeStepShown);

        newPage.submit(sendSubmit);

        $(".chosen-select").chosen({disable_search_threshold: 5, width: "90%"});

        $('#search').multiselect({
            search: {
                left: '<input type="text" name="q" class="form-control" placeholder="Search..." style="width: 60%; font-size: 20px; margin-left: 0%; float: left;"/> <label id="available-members" style="margin-left: 0px;">0 available</label>',
                right: ''
            }
        });

        //Apply title to legends
        paintLabels();

        /***********************************************/
        /*Configure new or existing group*/
        $('.new-existing-group').on('click', selectNewOrExisting);
        $('#group-list').on('change', selectGroup);

        /*Select members of the group*/
        $('#group-name').on('keyup', nameGroupChange);
        $('.btn-move-data').on('click', peopleOnListChange);
        $('#search, #search_to').on('dblclick', peopleOnListChange);

        /*New group form is deactivated*/
        $('.change-name-description').on('blur', editNameDescription);

        $('#ordering-type').change(changeOrder);

        confBackButton();   // we need to run this the first time the dialog renders

        //  Redraw tooltip at every step.
        function confBackButton() {
            var step = $('#new_ipage_form').formwizard('state');
            var width = 920, height = 800;
            if (step.isFirstStep){  // parent page list
                switch(step.currentStep){  //When in edition mode, first step actually is step-3
                    case 'step-1': //Group edition
                        //Activate controls
                        $(".chosen-select").prop("disabled", groupData.isNewGroup).trigger("chosen:updated");

                        width = 650; height = 300;
                        break;
                }

                $('input[type=reset]').hide();
            }
            else if (step.isLastStep){  // page template chooser
                width = 400;
                height = 750;

                populateRankForm();

                $('input[type=reset]').show();
            }
            else{ // page title, type selector, and alias screen (2nd step)
                switch(step.currentStep){
                    case 'step-2':
                        width = 650;
                        height = 575;

                        //Activate controls
                        $(".chosen-select").prop("disabled", false).trigger("chosen:updated");
                        break;

                    case 'step-3':

                        //Activate controls
                        $("#create_group").prop("disabled", false);
                        break;
                }

                $('input[type=reset]').show();
            }

            window.parent.Shadowbox.skin.dynamicResize(width, height);

            setTimeout(addInfoTooltips, 300);
        }

        function selectNewOrExisting(e){

            e.stopPropagation();

            var groupChooser = $(e.currentTarget).val();
            var step2 = $("#step-2");
            var nextButton = $('#create_group');
            var combos = $(".chosen-select");

            groupData.isNewGroup = (groupChooser === "new");
            groupData.id = 0;
            groupData.name = "";
            groupData.description = "";
            groupData.members = [];

            //Reset the list of groups
            combos.val(0).trigger("chosen:updated");

            if (groupData.isNewGroup){

                //Create step-2
                if (!step2.length){
                    $('#step-1').after(secondStep);
                    $('#group-by-ipt').bind('click', showIptList);
                    $(".chosen-select").chosen({disable_search_threshold: 5, width: "90%"}).trigger("chosen:updated");
                }

                combos.prop("disabled", true).trigger("chosen:updated");
                var query = getGroupMembers(groupData.id);
                query.done(function(data){
                    buildOptions(data)
                }).fail(function(data){
                    console.log(data);
                }).always(function(){
                    nextButton.removeClass('ui-state-disabled').addClass('ui-state-active');
                });
            }
            else{
                $("#step-2").remove();
                $(".chosen-select").prop("disabled", false).trigger("chosen:updated");
            }

            $('#new_ipage_form').formwizard("update_steps");
            confBackButton();

            if (groupData.isNewGroup){
                nextButton.removeClass('ui-state-disabled').addClass('ui-state-active').prop("disabled", false);
            }
            else{
                nextButton.removeClass('ui-state-active').addClass('ui-state-disabled').prop("disabled",true);
            }
        }

        function selectGroup(e){
            e.stopPropagation();

            if (groupData.isNewGroup)
            {
                return;
            }

            var selectedGroup = $(e.currentTarget).find(':selected');
            var nextButton = $('#create_group');

            groupData.id = parseInt(selectedGroup.val());
            groupData.orderingType = selectedGroup.data('ordering-type') || sortingTypes.alphabetical;

            if (groupData.id > 0){
                nextButton.removeClass('ui-state-active').addClass('ui-state-disabled').prop('disabled', true);

                groupData.name = selectedGroup.text();
                groupData.description = $.trim(selectedGroup.data('description'));

                var query = getGroupMembers(groupData.id);
                query.done((data) => {
                    buildOptions(data)
                }).fail(function(data){
                    console.log(data);
                }).always(function(){
                    nextButton.removeClass('ui-state-disabled').addClass('ui-state-active').prop('disabled', false);
                });
            }
            else{
                 nextButton.removeClass('ui-state-active').addClass('ui-state-disabled');
            }
        }

        function peopleOnListChange(e){
            e.stopPropagation();
            /*Deactivate next button if there's no people on list*/
            var options = $('#search_to').find('option');
            $('#create_group').prop('disabled', (!options.length));

            groupData.members.forEach((item) => {
                item.exists = false;
                item.checked = false;
            });

            $.each(options, function(index, item) {
                var selectedId = $(item).data('person-id') ? parseInt($(item).data('person-id')) : parseInt($(item).val());
                var rank = groupData.orderingType == sortingTypes.alphabetical ? 1 : groupData.members.length + 1;
                var person = groupData.members.filter((m) => {
                    return m.person === selectedId;
                });

                if (person.length) {
                    person[0].checked = true;
                    person[0].exists = !!(person[0].id);
                } else {
                    groupData.members.push({
                        id: 0,
                        rank: rank,
                        person: selectedId,
                        name: $(item).text(),
                        exists: false,
                        isNew: true,
                        checked: true,
                        familyName: $(item).data('family-name')
                    });
                }
            });

            //Remove new people that will not be sent to the server
            groupData.members = groupData.members.filter((x) => { return !(x.isNew && !x.checked); });

            paintLabels();
        }

        function nameGroupChange(e){
            e.stopPropagation();
            /*Deactivate next button if group name has no content*/
            $('#create_group').prop('disabled', (!$(this).val().trim().length));
        }

        function doBeforeStepShown(event, data){

            var previousStep = $('#' + data.previousStep);
            var fromNewOrExisting = $('.new-existing-group:checked').val();
            var groupName, groupDescription;

            //fill the step 2 with the members and group data
            switch (previousStep.attr('id')){
                case 'step-2':

                    if (fromNewOrExisting === 'new'){
                        groupName = $('#group-name').val();
                        var selectedIpt = $('#group-ipt').find('option:selected');

                        groupDescription = $('#group-description').val();
                        groupData.ipt = selectedIpt.text();
                        groupData.iProgramTemplateId = selectedIpt.val();
                        groupData.isGroupedByIpt = $('#group-by-ipt').is(':checked');
                        groupData.description = groupDescription || '';
                        groupData.wikiPermalink = $('#group-wiki').val();
                        groupData.showTitle = $('#show-title').is(':checked');
                    }

                    if (fromNewOrExisting === 'existing'){
                        var selectedGroup = previousStep.find('#group-list').find('option:selected');

                        groupName = selectedGroup.text();
                        groupDescription = selectedGroup.data('description');
                    }

                    /*Updating group object*/
                    groupData.name = groupName || '';
                    groupData.description = groupDescription || '';

                    break;
            }

            $('#edit-group-name').val(groupData.name);
            $('#edit-group-description').val(groupData.description);
        }

        function populateMembers(){
            var options = $('#search_to').find('option');
            groupData.members = [];

            $.each(options, function(key, item){
                var id = parseInt($(item).val());
                var person = parseInt($(item).data('person-id'));
                var rank = parseInt($(item).data('person-rank'));
                var name =  $(item).text();
                var familyName = $(item).data('family-name');

                groupData.members.push({id: id, person: person, rank: rank, name: name, familyName: familyName, exists: true, isNew: false});
            });
        }

        function editNameDescription(e){
            e.stopPropagation();

            var item = $(this);

            switch (item.attr('id')){
                case 'edit-group-name':
                    groupData.name = item.val();
                    break;
                case 'edit-group-description':
                    groupData.description = item.val();
                    break;
            }
        }

        function sendSubmit (event) {
            event.preventDefault();

            if (!$.trim(groupData.name)){
                alert("Please enter group Name.");
                return false;
            }

            if (!groupData.members.length){
                alert("Add at least one member before submit.");
                return false;
            }

            var parent = window.parent.$('body');
            var iPageId = parent.data('ipage-id');
            var iBlockUniqid = parent.find('.adding-block').data('iblock-id');
            var iContentParent = parent.find('.adding-zone').data('icontent-id');
            var iContentNode = $('#content-id').val();

            groupData.iPageId = iPageId;
            groupData.iBlockId = iBlockUniqid;
            groupData.iContentParent = iContentParent;
            groupData.iContentNode = iContentNode ? parseInt(iContentNode) : 0;

            groupData.showTitle = (groupData.showTitle) ? 1 : 0;

            var request = saveGroupMembers(groupData);

           $('body').mask("saving group data", 0);

            request.done((res) => {
                setTimeout(() => {
                    $('body').unmask();
                    window.parent.location.reload();
                }, 3500);
            }).fail((res) => {
                console.log(res);
            });
        }

        function buildOptions(data){

            var fromList = $("#search");
            var toList = $("#search_to");
            var pages = $("#pages");

            var addComboElements = (element, rows) =>{
                rows.forEach((item) => {
                    element.append(`<option value="${item.id}" data-person-id="${item.person}" data-person-rank="${item.rank}" data-family-name="${item.familyName}">${item.name}</option>`);
                });
            };

            var addListElements = (element, rows) =>{
                if (rows.length) {
                    rows.forEach((item, index) => {
                        element.append(`<li>${index + 1}. ${item.name}</li>`);
                    });
                } else {
                    element.append('<li>No pages found</li>');
                }
            };

            fromList.empty();
            toList.empty();
            pages.empty();

            addComboElements(fromList, JSON.parse(data.propMap.peopleNotInGroup));
            addComboElements(toList, JSON.parse(data.propMap.peopleInGroup));
            addListElements(pages, JSON.parse(data.propMap.pagesList));

            populateMembers();
            paintLabels();
        }

        function populateRankForm(){
            var rankForm = $("#rank-form");
            var orderSelect = $('#ordering-type');
            var result = groupData.members.filter((m) => {
                return m.isNew || m.exists;
            });

            if (!result.length){
                alert ("Add at least one member before going elsewhere.");
                return false;
            }

            //Disabled or not option to establish the ordering type
            orderSelect.val(groupData.orderingType).prop('disabled', !groupData.isNewGroup);

            rankForm.empty();

            result.sort(sortMembers())
              .forEach((item) => {
                rankForm.append(`<li data-member="${item.person}">${item.name}</li>`);
            });

            if (groupData.orderingType === sortingTypes.alphabetical) {
                if (rankForm.hasClass('ui-sortable')) {
                    rankForm.sortable("destroy")
                        .removeClass('order-items');
                }
            } else {
                 rankForm.sortable({
                     stop: function (e, ui) {
                          setRankValue();
                     }
                 }).addClass('order-items');
            }
        }

        function sortMembers(){
            if (groupData.orderingType == sortingTypes.custom) {
                return (m1, m2) => {
                    return m1.rank - m2.rank;
                }
            } else {
                return (m1, m2) => {
                    var aName = m1.familyName.toLowerCase();
                    var bName = m2.familyName.toLowerCase();
                    return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
                }
            }
        }

        function setRankValue(){
            var rankList = $('#rank-form').find('li');

            $.each(rankList, function (index, item) {
                var id = $(item).data('member');
                var member = groupData.members.filter((m) => {
                    return m.person === id;
                });

                member[0].rank = groupData.orderingType == sortingTypes.alphabetical ? 1 : (index + 1);
            });
        }

        function showIptList(){
            var display = "none";
            if ($(this).is(':checked')){
                display = "block";
            }

            $('#ipt-list').css('display', display);
        }

        function changeOrder(e){

            e.stopPropagation();

            groupData.orderingType = $(this).val();

            populateRankForm();
        }
    });
