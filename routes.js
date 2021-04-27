const express = require('express');
const router = express.Router();
const axios = require("axios");

const API_KEY = "59e1a8bdd05f5059f7a2fe4b65ed990c"
const DOMAIN = "https://api.themoviedb.org"
const BACKDROP_PATH = "https://image.tmdb.org/t/p/w780"
const POSTER_PATH = "https://image.tmdb.org/t/p/w500"
const DEFAULT_VIDEO_LINK = `tzkWB85ULJY`
const DEFAULT_POSTER = "https://strs1byn99.github.io/img/utils/movie-placeholder.png"
const DEFAULT_BACKDROP = "https://strs1byn99.github.io/img/utils/movie-placeholder.jpg"
const MV_TYPE = "movie"
const TV_TYPE = "tv"

router.get('/test', (req, res) => {
    console.log("test");
    res.send("test");
})

function getYear(type, each) {
    let year = "";
    if (type == MV_TYPE) {
        year = each.release_date === "" ? "N/A" : each.release_date.slice(0,4);
    } else {
        year = each.first_air_date === "" ? "N/A" : each.first_air_date.slice(0,4);
    }
    return year;
}

router.get('/search', (req, res) => {
    let query = req.query.query;
    url = `${DOMAIN}/3/search/multi?api_key=${API_KEY}&language=en-US&query=${query}`
    axios.get(url).then(response => {
        let data = response.data["results"]
        var results = []
        for (let i = 0, len = data.length; i < len; i += 1) {
            let each = data[i];
            let type = each.media_type
            if (each.backdrop_path == null || type == "person") continue;
            let backdrop_path = `${BACKDROP_PATH}${each.backdrop_path}`
            
            results.push({"id": each.id, "title": (type == TV_TYPE ? each.name : each.title), 
                    "img": backdrop_path, "type": type, 
                    "rating": each.vote_average == null ? 
                            "0" : `${each.vote_average/2}`, 
                    "year": getYear(type, each)})
        }
        res.send(results.slice(0,20))
    }).catch(err => res.send(err));
})

function getPlayingData(playing_data) {
    var playing_list = [];
    for (let i = 0; i < 6; ) {
        let each = playing_data[i];
        if (each.poster_path != null) {
            let poster_path = `${POSTER_PATH}${each.poster_path}`;
            playing_list.push({"id": each.id, "img": poster_path});
            i += 1;
        }
    }
    return playing_list;
}

router.get('/playing', (req, res) => {
    playing_url = axios.get(`${DOMAIN}/3/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`)
    trending_url = axios.get(`${DOMAIN}/3/trending/tv/day?api_key=${API_KEY}&language=en-US&page=1`)    
    axios.all([playing_url, trending_url]).then(axios.spread((...resp) => {
        let mv = getPlayingData(resp[0].data["results"]);
        let tv = getPlayingData(resp[1].data["results"]);
        console.log(tv)
        res.send({"mv": mv, "tv": tv});
    })).catch(err => res.send(err));
})

function getVideo(list) {
    let first = list[0] // default the first one
    let trailers = list.filter(each => each.type == "Trailer")
    console.log(trailers)
    let teasers = list.filter(each => each.type == "Teaser")
    console.log(teasers)
    if (trailers.length > 0) return trailers[0];
    if (teasers.length > 0) return teasers[0];
    return null;
}

router.get('/movie/:id', (req, res) => {
    let mid = req.params.id;
    let video = axios.get(`${DOMAIN}/3/movie/${mid}/videos?api_key=${API_KEY}&language=en-US&page=1`)
    let detail = axios.get(`${DOMAIN}/3/movie/${mid}?api_key=${API_KEY}&language=en-US&page=1`)
    let review = axios.get(`${DOMAIN}/3/movie/${mid}/reviews?api_key=${API_KEY}&language=en-US&page=1`)
    let cast = axios.get(`${DOMAIN}/3/movie/${mid}/credits?api_key=${API_KEY}&language=en-US&page=1`)
    let recc = axios.get(`${DOMAIN}/3/movie/${mid}/recommendations?api_key=${API_KEY}&language=en-US&page=1`)
    axios.all([video, detail, review, cast, recc]).then(axios.spread((...resp) => {
        var vid, det, rev = [], cas = [], rec;
        let video_res = resp[0].data["results"]
        vid = {"type": "", "site": "", "name": "", "link": DEFAULT_VIDEO_LINK}
        if (video_res.length != 0) {
            let v = getVideo(video_res)
            if (v) {
                vid = {"type": v.type, "site": v.site, "name": v.name, "link": v.key}
            } else {
                vid = {"type": "", "site": "", "name": "", "link": DEFAULT_VIDEO_LINK}
            }
        }
        let detail_res = resp[1].data
        let poster = detail_res.poster_path == null ? 
            DEFAULT_POSTER : `${POSTER_PATH}${detail_res.poster_path}`
        det = {"title": detail_res.title, 
            "year": detail_res.release_date === "" ? "" : detail_res.release_date.slice(0,4),
            "vote": detail_res.vote_average,
            "overview": detail_res.overview == null ? "" : detail_res.overview,
            "genres": detail_res.genres.map(each => each.name).join(', '),
            "spoken_languages": detail_res.spoken_languages.map(each => each.english_name).join(', '),
            "poster": poster,
            "id": detail_res.id,
            "backdrop": detail_res.backdrop_path == null ? DEFAULT_BACKDROP : `${BACKDROP_PATH}${detail_res.backdrop_path}`,
        }
        let review_res = resp[2].data["results"]
        review_res = review_res.length > 3 ? review_res.splice(0,3) : review_res
        review_res.map((each) => {
            let date = convertDate(each.created_at)
            let line = `by ${each.author} on ${date}`
            tmp = {"content": each.content,
                "by": line,
                "rating": each.author_details.rating == null ? 
                        "0/5" : `${each.author_details.rating/2}/5`,
            }
            rev.push(tmp)
        })
        let cast_res = resp[3].data["cast"]
        let cast_taken_size = cast_res.length > 6 ? 6 : cast_res.length;
        for (let i = 0; i < cast_taken_size; i += 1) {
            each = cast_res[i];
            if (each.profile_path == null) continue;
            cas.push({"id": each.id, "name": each.name, "character": each.character, 
                "img": `${POSTER_PATH}${each.profile_path}`
            })
        }
        let recc_res = resp[4].data["results"]
        rec = recc_res.reduce((result, each) => {
            if (each.poster_path != null) {
                let poster_path = `${POSTER_PATH}${each.poster_path}`
                result.push({"id": each.id, "title": each.title, 
                        "img": poster_path, "type": MV_TYPE})
            }
            return result.slice(0,10);
        }, []);
        res.send({"video": vid, "detail": det, "review": rev, "cast": cas, "recc": rec})
    })).catch(err => res.send(err));
})

function convertDate(raw_date) {
    let myDate = new Date(raw_date);
    // timeZone: "America/Los_Angeles", 
    let  pstDate = myDate.toLocaleDateString("en-US", 
        {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})
    let arr = pstDate.split(', ')
    let d = myDate.getDate() < 10 ? arr[1].slice(0,3) + " 0" + myDate.getDate() : arr[1]
    pstDate = `${arr[0]}, ${d} ${arr[2]}`
    return pstDate;
}

router.get('/tv/:id', (req, res) => {
    let mid = req.params.id;
    let video = axios.get(`${DOMAIN}/3/tv/${mid}/videos?api_key=${API_KEY}&language=en-US&page=1`)
    let detail = axios.get(`${DOMAIN}/3/tv/${mid}?api_key=${API_KEY}&language=en-US&page=1`)
    let review = axios.get(`${DOMAIN}/3/tv/${mid}/reviews?api_key=${API_KEY}&language=en-US&page=1`)
    let cast = axios.get(`${DOMAIN}/3/tv/${mid}/credits?api_key=${API_KEY}&language=en-US&page=1`)
    let recc = axios.get(`${DOMAIN}/3/tv/${mid}/recommendations?api_key=${API_KEY}&language=en-US&page=1`)
    axios.all([video, detail, review, cast, recc]).then(axios.spread((...resp) => {
        var vid, det, rev = [], cas = [], rec;
        let video_res = resp[0].data["results"]
        vid = {"type": "", "site": "", "name": "", "link": DEFAULT_VIDEO_LINK}
        if (video_res.length != 0) {
            let v = getVideo(video_res)
            if (v) {
                vid = {"type": v.type, "site": v.site, "name": v.name, "link": v.key}
            } else {
                vid = {"type": "", "site": "", "name": "", "link": DEFAULT_VIDEO_LINK}
            }
        }
        let detail_res = resp[1].data
        let poster = detail_res.poster_path == null ? 
            DEFAULT_POSTER : `${POSTER_PATH}${detail_res.poster_path}`
        det = {"title": detail_res.name, 
            "year": detail_res.first_air_date === "" ? "" : detail_res.first_air_date.slice(0,4),
            "vote": detail_res.vote_average,
            "overview": detail_res.overview == null ? "" : detail_res.overview,
            "genres": detail_res.genres.map(each => each.name).join(', '),
            "spoken_languages": detail_res.spoken_languages.map(each => each.english_name).join(', '),
            "poster": poster,
            "id": detail_res.id,
            "backdrop": detail_res.backdrop_path == null ? DEFAULT_BACKDROP : `${BACKDROP_PATH}${detail_res.backdrop_path}`,
        }
        let review_res = resp[2].data["results"]
        review_res = review_res.length > 3 ? review_res.splice(0,3) : review_res
        review_res.map((each) => {
            let date = convertDate(each.created_at)
            let line = `by ${each.author} on ${date}`
            tmp = {"content": each.content,
                "by": line,
                "rating": each.author_details.rating == null ? 
                        "0/5" : `${each.author_details.rating/2}/5`,
            }
            rev.push(tmp)
        })
        let cast_res = resp[3].data["cast"]
        let cast_taken_size = cast_res.length > 6 ? 6 : cast_res.length;
        for (let i = 0; i < cast_taken_size; i += 1) {
            each = cast_res[i];
            if (each.profile_path == null) continue;
            cas.push({"id": each.id, "name": each.name, "character": each.character, 
                "img": `${POSTER_PATH}${each.profile_path}`
            })
        }
        let recc_res = resp[4].data["results"]
        rec = recc_res.reduce((result, each) => {
            if (each.poster_path != null) {
                let poster_path = `${POSTER_PATH}${each.poster_path}`
                result.push({"id": each.id, "title": each.name, 
                        "img": poster_path, "type": TV_TYPE})
            }
            return result.slice(0,10);
        }, []);
        res.send({"video": vid, "detail": det, "review": rev, "cast": cas, "recc": rec})
    })).catch(err => res.send(err));
})

function getDetail(json, type) {
    var result = [];
    for (let i = 0, len = json.length; i < len; i += 1) {
        let each = json[i];
        if (each.poster_path == null) continue;
        let poster_path = `${POSTER_PATH}${each.poster_path}`;
        
        result.push({"id": each.id, "title": type === MV_TYPE ? each.title : each.name, 
                "img": poster_path, "type": type})
    }
    return result;
}

router.get('/home' ,(req, res) => {
    let popularmv = axios.get(`${DOMAIN}/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    let topratedmv = axios.get(`${DOMAIN}/3/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`);
    let populartv = axios.get(`${DOMAIN}/3/tv/popular?api_key=${API_KEY}&language=en-US&page=1`);
    let topratedtv = axios.get(`${DOMAIN}/3/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`);
    axios.all([popularmv, topratedmv, populartv, topratedtv]).then(axios.spread((...resp) => {
        let popmv = getDetail(resp[0].data["results"], MV_TYPE);
        let topmv = getDetail(resp[1].data["results"], MV_TYPE);
        let poptv = getDetail(resp[2].data["results"], TV_TYPE);
        let toptv = getDetail(resp[3].data["results"], TV_TYPE);
        res.send({"popmv": popmv, "topmv": topmv,
                "poptv": poptv, "toptv": toptv});
      })
    ).catch(err => res.send(err));
})


module.exports = router;
