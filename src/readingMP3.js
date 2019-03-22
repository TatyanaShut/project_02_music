
//все необходиме модули
var debug = require('debug')('readingFiles'); //логирование
var fs = require('fs'); //подключаем модуль fs(чтение файла)
var path = require('path');
var async = require('async');
var mm = require('musicmetadata'); //подключаем модуль musicmetadata(позволяет читать теги mp3-файла
//для хэш-суммы: Crypto & MD5
var crypto = require("crypto");
var md5 = require('md5');
//картинка хранится как массив байтов.Кодируем с помощью этого
var base64js = require('base64-js');
var pathToFile = "/Users/tatyanashut/ReadingMusic/music/"; //путь к файлу
//необходимые переменные для работы
var songsArray = [];
var allSongsValue = 0;
var newArrayOfSongs = [];
var arrayOfFullDuplicates = [];
var arrayOfFullDuplicatesToDebug = [];
var hashAll = [];

//исполняемые функции
readDataInFolder(); //первое и третье задание
makeHashOfAllFiles(); //2-ой пункт


function readDataInFolder() {
    var getFiles = function(dir, files_) {//чтение каталогов с подкоталогами
        files_ = files_ || [];
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()) {
                getFiles(name, files_);
            } else {
                if (fs.statSync(name).isFile() && /\.mp3$/.test(name)) //проверка типа файла 
                    files_.push(name);
                
            }
        }
        return files_;
    };
    var folderContent = getFiles(pathToFile); //хранит в себе только мр3-файлы
    debug("All mp3 files in folder:",folderContent);
    //теперь folderContent хранит в себе все мр-3 файлы
    allSongsValue = folderContent.length; //хранит количество мр-3 файлов в папке

    for (var i = 0; i < folderContent.length; i++) {
        showMetaData(fs.createReadStream(folderContent[i]),folderContent[i], folderContent[i].substring(folderContent[i].lastIndexOf("/")+1));
    }
}


async function showMetaData(data, path, nameOfFile) { // читает теги мр-3 data:содержимое после прочтения файла, path: полный путь к файлу ,nameOfFile: название файла
    mm(data, { //функция mm - функция модуля musicmetadata- она и читает теги mp-3
        duration: true //также получение длительности файла
    }, function(err, result) {
        if (err) throw err;
        //console.log(result);
        debug("All mp3 files with tags in folder :",result);
        var newSongObject = {
            "Info": result,
            "Link": path,
            "FileName": nameOfFile
        }
        songsArray.push(newSongObject); //добовляем в конец массива newSongObject

        if (songsArray.length == allSongsValue) { //когда прочитали все файлы
            //console.log(songsArray);
            parseArrayOfSongs(songsArray); //для 1-го пункта
            parseArrayOfSongsWithDuplicate(songsArray); //для 3-его пункта
        }
    });
}

async function parseArrayOfSongs(arrayOfSongs) {
    await new Promise((resolve, reject) => {
        var arrayOfArtists = []; //массив всех исполнителей
        var untitledArtistNum = 1;
        //получаем массив со всеми исполнителями
        for (var i = 0; i < arrayOfSongs.length; i++) {
            var artistExists = false;
            var arist = arrayOfSongs[i].Info.artist.toString(); //получили имя исполнителя
            for (var j = 0; j < arrayOfArtists.length; j++) {
                var artistToCheck = arrayOfArtists[j].toString();
                if (artistToCheck == "")
                    artistToCheck = "UntitledArtist";
                if (arist == artistToCheck) {
                    artistExists = true;
                    break;
                }
            }
            if (!artistExists) {
                if (arist == "")
                    arist = "UntitledArtist";
                arrayOfArtists.push(arist);
            }
        }

        for (var i = 0; i < arrayOfArtists.length; i++) {
            var newArtist = {
                "Artist": arrayOfArtists[i],
                "Albums": []
            };
            newArrayOfSongs.push(newArtist); //newArrayOfSongs - массив упорядоченных песен для html
        }

        for (var i = 0; i < newArrayOfSongs.length; i++) {
            for (var j = 0; j < arrayOfSongs.length; j++) {
                if (arrayOfSongs[j].Info.artist.toString() == newArrayOfSongs[i].Artist.toString()) {
                    var albumExists = false;
                    for (var k = 0; k < newArrayOfSongs[i].Albums.length; k++) {
                        if (newArrayOfSongs[i].Albums[k].Album.toString() == arrayOfSongs[j].Info.album.toString()) {
                            albumExists = true;
                            break;
                        }
                    }
                    if (!albumExists) {
                        var newAlbum = {
                            "Album": arrayOfSongs[j].Info.album.toString(),
                            "Songs": [],
                            "Picture": arrayOfSongs[j].Info.picture
                        };
                        newArrayOfSongs[i].Albums.push(newAlbum);
                    }
                }
            }
        }
        //теперь у каждого исполнителя есть список альбомов
        for (var i = 0; i < newArrayOfSongs.length; i++) {
            for (var j = 0; j < newArrayOfSongs[i].Albums.length; j++) {
                var nameOfAlbum = newArrayOfSongs[i].Albums[j].Album.toString();
                for (var k = 0; k < arrayOfSongs.length; k++) {
                    if (arrayOfSongs[k].Info.album.toString() == nameOfAlbum.toString() && arrayOfSongs[k].Info.artist.toString() == newArrayOfSongs[i].Artist.toString()) {
                        var songExists = false;
                        for (var l = 0; l < newArrayOfSongs[i].Albums[j].Songs.length; l++) {

                            if (newArrayOfSongs[i].Albums[j].Songs[l].Song == arrayOfSongs[k].Info.title.toString())
                                songExists = true;
                        }
                        if (!songExists) {
                            var newSong = {
                                "Song": arrayOfSongs[k].Info.title.toString(),
                                "Duration": parseInt(arrayOfSongs[k].Info.duration),
                                "Link": arrayOfSongs[k].Link.toString(),
                            };
                            newArrayOfSongs[i].Albums[j].Songs.push(newSong);
                        }
                    }
                }
            }
        }
        // получили сформированный массив newArrayOfSongs;

        /////////////------------------
        //создаем файл
        var fileName = 'listOfMusicInFolder.html';
        //записываем информацию
        var stream = fs.createWriteStream(fileName);
        stream.once('open', function(fd) {
            var html = buildHtml(newArrayOfSongs); //создает html контент на странице
            stream.end(html);
        });
        resolve();
    });
}

async function makeHashOfAllFiles() {
    var getFiles = function(dir, files_) {//чтение каталогов с подкоталогами
        files_ = files_ || [];
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()) {
                getFiles(name, files_);
            } else {
                if (fs.statSync(name).isFile() && /\.mp3$/.test(name)) //проверка типа файла 
                    files_.push(name);
                
            }
        }
        return files_;
    };
    var listOfMP3files = getFiles(pathToFile); //хранит в себе только мр3-файлы
    //теперь listOfMP3files хранит в себе все мр-3 файлы
    //получаем контрольную сумму
    (function makeHash(i) {
        var fd = fs.createReadStream(listOfMP3files[i]);
        var hash = crypto.createHash("md5");
        hash.setEncoding("hex");
        fd.on("end", () => {
            hash.end();
            hashAll.push(`${listOfMP3files[i++]}:hash:${hash.read()}`);

            if (i < listOfMP3files.length) {
                makeHash(i);
            } else {
                createListOfSongsWithSameHash(hashAll);
            }

        });


        fd.pipe(hash);

    })(0);

}

function createListOfSongsWithSameHash(listOfSongs) { //ищет файлы с одинаковой контрольной суммой
    var duplicatesList = [];
    for (var i = 0; i < listOfSongs.length; i++) {
        if (listOfSongs[i] == "Checked")
            continue;
        var songHashToCheck = listOfSongs[i].substring(listOfSongs[i].indexOf(":hash:") + 6);
        var songTitleToCheck = listOfSongs[i].substring(0, listOfSongs[i].indexOf(":hash:"));
        var arrayOfDuplicates = [];
        var arrayOfPaths = [];
        for (var j = 0; j < listOfSongs.length; j++) {
            if (listOfSongs[j] == "Checked")
                continue;
            var songHash = listOfSongs[j].substring(listOfSongs[j].indexOf(":hash:") + 6);
            var songTitle = listOfSongs[j].substring(listOfSongs[j].lastIndexOf("/")+1, listOfSongs[j].indexOf(":hash:"));
            var songPath = listOfSongs[j].substring(0, listOfSongs[j].indexOf(":hash:"));

            if (songHash == songHashToCheck) {
                listOfSongs.splice(j, 1, "Checked");
                arrayOfDuplicates.push(songTitle);
                arrayOfPaths.push(songPath);
            }
        }
        if (arrayOfDuplicates.length > 1) {
            var duplicateItem = {
                "header": "Duplicate " + parseInt(duplicatesList.length + 1),
                "songs": arrayOfDuplicates,
                "path": arrayOfPaths
            };
            debug(" ");
            debug("Duplicate : " + parseInt(duplicatesList.length + 1), arrayOfDuplicates);
            duplicatesList.push(duplicateItem);
        }
        //duplicatesList массив дубликатов
    }
    //создаем файл
    var fileName = 'listOfDuplicates.html';
    var stream = fs.createWriteStream(fileName);
    stream.once('open', function(fd) {
        var html = buildHtmlOfDuplicates(duplicatesList);
        stream.end(html);
    });
}




async function parseArrayOfSongsWithDuplicate(arrayOfSongs) { //это для третьего -получаем полный список дубликатов 
    await new Promise((resolve, reject) => {
        for (var i = 0; i < arrayOfSongs.length; i++) {
            if (arrayOfSongs[i] == "Checked")
                continue;
            var songTitleToCheck = arrayOfSongs[i].Info.title.toString();
            var songAlbumToCheck = arrayOfSongs[i].Info.album.toString();
            var songArtistToCheck = arrayOfSongs[i].Info.artist.toString();
            var arrayOfCopies = [];
            var arrayOfCopiesToDebug = [];
            for (var j = 0; j < arrayOfSongs.length; j++) {
                if (arrayOfSongs[j] == "Checked")
                    continue;
                var songTitle = arrayOfSongs[j].Info.title.toString();
                var songAlbum = arrayOfSongs[j].Info.album.toString();
                var songArtist = arrayOfSongs[j].Info.artist.toString();
                if (songTitle == songTitleToCheck && songAlbumToCheck == songAlbum && songArtistToCheck == songArtist) {
                    var songDuplicate = {
                        "title": arrayOfSongs[j].FileName,
                        "link": arrayOfSongs[j].Link
                    }

                    arrayOfCopies.push(songDuplicate);
                    arrayOfCopiesToDebug.push(arrayOfSongs[j].FileName);
                    arrayOfSongs.splice(j, 1, "Checked");
                }
            }
            if (arrayOfCopies.length > 1) {
                var duplicateItem = {
                    "Artist": songArtistToCheck,
                    "Album": songAlbumToCheck,
                    "Title": songTitleToCheck,
                    "Duplicates": arrayOfCopies
                };
                var duplicateItemToDebug = {
                    "Artist": songArtistToCheck,
                    "Album": songAlbumToCheck,
                    "Title": songTitleToCheck,
                    "Duplicates": arrayOfCopiesToDebug
                };
                arrayOfFullDuplicates.push(duplicateItem);
                arrayOfFullDuplicatesToDebug.push(duplicateItemToDebug);
            }

        }
        debug("All full duplicates:");
        debug(arrayOfFullDuplicatesToDebug);
        //создаем файл 
        var fileName = 'listOfFullDuplicates.html';
        var stream = fs.createWriteStream(fileName);
        stream.once('open', function(fd) {
            var html = buildHtmlOfFullDuplicates(arrayOfFullDuplicates);
            stream.end(html);
        });
        resolve();
    });
}

function buildHtmlOfFullDuplicates(arrayOfDuplicates) { //html 3rd point
    var header = '<meta charset="UTF-8">' +
        '<link href="css/default.css" rel="stylesheet">';
    var div = "<h1>List of full duplicates in folder:</h1><div class = \"fullList\">";
    for (var j = 0; j < arrayOfDuplicates.length; j++) {
        var nameOfAlbum = arrayOfDuplicates[j].Album;
        if (nameOfAlbum == "") {
            nameOfAlbum = "UntitledAlbum";
        }
        var divChild = "<div class = \"listOfArtists\"><div class = \"artists\" style='width:500px;padding-bottom: 15px;'>" + arrayOfDuplicates[j].Artist + ", " + nameOfAlbum + ", " + arrayOfDuplicates[j].Title + ": " + "</div><ul>";
        for (var k = 0; k < arrayOfDuplicates[j].Duplicates.length; k++) {
            var nameOfSong = arrayOfDuplicates[j].Duplicates[k].title;
            var link = arrayOfDuplicates[j].Duplicates[k].link;
            divChild += "<li class = 'songs' style = \"padding-left:0px;\"><table><tr><td style='width: 65%;text-align: left;padding-left: 5px;'>" + parseInt(k + 1) + ". " + nameOfSong + "</td>" + '<td style="width: 29%;text-align: right;padding-left: 20px;"><a class = "button15" href="file:///' + link + '">Local file</a>' + "</td></tr></table></li>";
        }
        divChild += "</ul></div>";
        div += divChild;
    }
    div += "</div>";
    return '<!DOCTYPE html>' +
        '<html><head>' + header + '</head><body>' + div + '</body></html>';
}

function buildHtmlOfDuplicates(arrayOfDuplicates) { //2-ой пункт
    var header = '<meta charset="UTF-8">' +
        '<link href="css/default.css" rel="stylesheet">';
    var div = "<h1>List of duplicates in folder:</h1><div class = \"fullList\">";
    for (var j = 0; j < arrayOfDuplicates.length; j++) {
        var divChild = "<div class = \"listOfArtists\"><div class = \"artists\" style='padding-bottom: 15px;'>" + "Duplicates " + parseInt(j + 1) + ": " + "</div><ul>";
        for (var k = 0; k < arrayOfDuplicates[j].songs.length; k++) {
            var nameOfSong = arrayOfDuplicates[j].songs[k];
            var link = arrayOfDuplicates[j].path[k];
            divChild += "<li class = 'songs'><table><tr><td style='width: 65%;text-align: left;padding-left: 5px;'>" + parseInt(k + 1) + ". " + nameOfSong + "</td>" + '<td style="width: 29%;text-align: right;padding-left: 20px;"><a class = "button15" href="file:///' + link + '">Local file</a>' + "</td></tr></table></li>";
        }
        divChild += "</ul></div>";
        div += divChild;
    }
    div += "</div>";
    return '<!DOCTYPE html>' +
        '<html><head>' + header + '</head><body>' + div + '</body></html>';
}

function buildHtml(arrayOfSongs) { //html 1-point
    var header = '<meta charset="UTF-8">' +
        '<link href="css/default.css" rel="stylesheet">';
    var div = "<h1>List of music in folder:</h1><div class = \"fullList\">";
    for (var j = 0; j < arrayOfSongs.length; j++) {
        var artist = arrayOfSongs[j].Artist;
        var divChild = "<div class = \"listOfArtists\"><div class = \"artists\">" + "Artist " + parseInt(j + 1) + ": " + artist + "</div>";
        for (var k = 0; k < arrayOfSongs[j].Albums.length; k++) {
            var nameOfAlbum = arrayOfSongs[j].Albums[k].Album;
            if (nameOfAlbum == "") {
                nameOfAlbum = "UntitledAlbum";
            }
            //приводим картинку к нормальному виду
            var image = arrayOfSongs[j].Albums[k].Picture[0];
            if (image) {
                var base64String = "";
                var base64String = base64js.fromByteArray(image.data);
                var base64 = "data:" + image.format + ";base64," +
                    base64String;
                var imageBlock = '<div><img id="picture' + parseInt(k + 1) + '" src="' + base64 + '" alt= "picture extracted from ID3" />' + "</div>";
            } else {
                var imageBlock = "";
            }

            divChild += "<div class = 'albums'>" + "<div style= padding-top:15px;>Album " + parseInt(k + 1) + ": " + nameOfAlbum + "</div>" + imageBlock + "</div><h2>Tracks:</h2><div class = 'songsBlock'><ul>";
            divChild += "<li class = 'songs' style = 'background: lightgrey;'><table style = \"font-size:20px;\"><th><td style='width: 65%;text-align: center;'>" + "Title" + "</td><td style='width: 5%;text-align: center;'> " + "Duration" + '</td><td style="width: 29%;text-align: right;padding-right: 20px;">' + "Link" + "</td></th></table></li>";
            for (var i = 0; i < arrayOfSongs[j].Albums[k].Songs.length; i++) {
                var nameOfSong = arrayOfSongs[j].Albums[k].Songs[i].Song;
                var duration = arrayOfSongs[j].Albums[k].Songs[i].Duration;
                var link = arrayOfSongs[j].Albums[k].Songs[i].Link;
                var newDuration = Math.floor(duration / 60).toString() + ':';
                if (duration % 60 < 10)
                    newDuration += duration % 60 + "0";
                else
                    newDuration += duration % 60; //нормальный вид записи длительности в минутах
                divChild += "<li class = 'songs'><table><tr><td style='width: 65%;text-align: left;padding-left: 5px;'>" + parseInt(i + 1) + ". " + nameOfSong + "</td><td style='width: 5%;'> " + newDuration + '</td><td style="width: 29%;text-align: right;padding-left: 20px;"><a class = "button15" href="file:///' + link + '">Local file</a>' + "</td></tr></table></li>";
            }
            divChild += "</ul></div>";
        }
        divChild += "</ul></div>";
        div += divChild;
    }
    div += "</div>";
    return '<!DOCTYPE html>' +
        '<html><head>' + header + '</head><body>' + div + '</body></html>';
};
