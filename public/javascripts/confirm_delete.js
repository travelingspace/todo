//add an event listener to any buttons on the form with a delete class and present confirmation dialogue
var deleteButtons = document.querySelectorAll('.delete-button');

deleteButtons.forEach(function(button){

    button.addEventListener('click', function(ev){

        var okToDelete = confirm("Delete task - are you certain?");

        if (!okToDelete) {
            ev.preventDefault();
        }
    })
});