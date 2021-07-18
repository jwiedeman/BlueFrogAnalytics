FROM jekyll/jekyll:3.4

ADD . /srv/jekyll

RUN jekyll build

EXPOSE 4000